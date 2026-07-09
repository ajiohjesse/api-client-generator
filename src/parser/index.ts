import type {
  OpenAPISpec,
  ParsedOperation,
  ParsedResponse,
  SchemaObject,
  PathItem,
  OperationObject,
  ParameterObject,
} from '../types.js';
import { resolveSchema } from './resolver.js';
import { toTypeName } from '../naming.js';

function extractOperationId(operation: OperationObject, method: string, path: string): string {
  if (operation.operationId) {
    return operation.operationId;
  }
  const cleanPath = path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return `${method.toLowerCase()}${cleanPath}`;
}

function mergeParentParams(pathItem: PathItem, operation: OperationObject): ParameterObject[] {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])];
}

export function parseSpec(data: unknown): {
  operations: ParsedOperation[];
  schemas: Record<string, SchemaObject>;
} {
  const spec = data as OpenAPISpec;

  if (!spec.openapi) {
    throw new Error('Invalid OpenAPI spec: missing "openapi" field');
  }

  if (!spec.paths || typeof spec.paths !== 'object') {
    throw new Error('Invalid OpenAPI spec: missing "paths" field');
  }

  const rawSchemas = spec.components?.schemas || {};
  const schemas: Record<string, SchemaObject> = {};

  for (const [name, schema] of Object.entries(rawSchemas)) {
    const typeName = toTypeName(name);
    const resolved = resolveSchema(schema, spec, new Set(), 0, 10);
    resolved._sourceName = typeName;
    schemas[typeName] = resolved;
  }

  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'] as const;

  const operations: ParsedOperation[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of methods) {
      const operation = (pathItem as PathItem)[method];
      if (!operation) continue;

      const allParams = mergeParentParams(pathItem as PathItem, operation);

      const op: ParsedOperation = {
        method: method.toUpperCase(),
        path,
        operationId: extractOperationId(operation, method, path),
        parameters: allParams,
        pathParams: allParams.filter((p) => p.in === 'path'),
        queryParams: allParams.filter((p) => p.in === 'query'),
        requestBody: undefined,
        responses: [],
        hasBody: false,
      };

      if (operation.requestBody?.content) {
        const jsonContent = operation.requestBody.content['application/json'];
        if (jsonContent?.schema) {
          op.requestBody = resolveSchema(jsonContent.schema, spec, new Set(), 0, 10);
          op.hasBody = true;
        }
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const parsed: ParsedResponse = { status };
        if (response.content?.['application/json']?.schema) {
          parsed.schema = resolveSchema(response.content['application/json'].schema, spec, new Set(), 0, 10);
        }
        op.responses.push(parsed);
      }

      operations.push(op);
    }
  }

  return { operations, schemas };
}
