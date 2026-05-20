import type { ParsedOperation, SchemaObject } from '../types.js';
import {
  operationMethodName,
  buildParamTypeName,
  toPascalCase,
} from './utils.js';

function schemaToTypeString(schema: SchemaObject | undefined, importTypes: Set<string>): string {
  if (!schema) return 'void';

  if (schema.nullable) {
    const inner = schemaToTypeString({ ...schema, nullable: false }, importTypes);
    const needsParens = inner.includes('&');
    return needsParens ? `(${inner}) | null` : `${inner} | null`;
  }

  if (schema.$ref) {
    const parts = schema.$ref.split('/');
    const name = toPascalCase(parts[parts.length - 1]);
    importTypes.add(name);
    return name;
  }

  if (schema.allOf && schema.allOf.length > 0) {
    const parts = schema.allOf.map((s) => schemaToTypeString(s, importTypes));
    return parts.join(' & ');
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const parts = schema.oneOf.map((s) => schemaToTypeString(s, importTypes));
    return parts.join(' | ');
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const parts = schema.anyOf.map((s) => schemaToTypeString(s, importTypes));
    return parts.join(' | ');
  }

  if (schema.enum) {
    const values = schema.enum.map((v) => {
      if (typeof v === 'string') return `'${v}'`;
      return String(v);
    });
    return values.join(' | ');
  }

  if (schema.type === 'array') {
    if (schema.items) {
      const itemType = schemaToTypeString(schema.items, importTypes);
      return `${itemType}[]`;
    }
    return 'unknown[]';
  }

  if (schema.type === 'object' || schema.properties) {
    if (!schema.properties && !schema.additionalProperties) {
      return 'Record<string, never>';
    }

    const lines: string[] = ['{'];
    if (schema.properties) {
      const requiredSet = new Set(schema.required || []);
      for (const [key, prop] of Object.entries(schema.properties)) {
        const optional = requiredSet.has(key) ? '' : '?';
        const propType = schemaToTypeString(prop, importTypes);
        lines.push(`  ${key}${optional}: ${propType};`);
      }
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const valueType = schemaToTypeString(schema.additionalProperties, importTypes);
      lines.push(`  [key: string]: ${valueType};`);
    } else if (schema.additionalProperties === true) {
      lines.push(`  [key: string]: unknown;`);
    }
    lines.push('}');
    return lines.join('\n');
  }

  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'string':
      return 'string';
    default:
      return 'unknown';
  }
}

export interface GeneratedClient {
  code: string;
}

export function generateClient(
  operations: ParsedOperation[],
  options: { clientName?: string }
): GeneratedClient {
  const clientName = options.clientName || 'ApiClient';
  const importTypes = new Set<string>();
  const methods: string[] = [];
  const extraTypes: string[] = [];
  const usedMethodNames = new Map<string, number>();

  for (const op of operations) {
    let methodName = operationMethodName(op.operationId, op.method, op.path);
    const count = usedMethodNames.get(methodName) ?? 0;
    usedMethodNames.set(methodName, count + 1);
    if (count > 0) {
      methodName = `${methodName}_${count}`;
    }

    const pathParams = op.pathParams;
    const queryParams = op.queryParams;
    const hasBody = op.hasBody;
    const hasQuery = queryParams.length > 0;

    const paramsTypeName = buildParamTypeName(op.operationId, op.method, op.path);

    const fnParams: string[] = [];

    for (const pp of pathParams) {
      const tsType = schemaToTypeString(pp.schema, importTypes);
      fnParams.push(`${pp.name}: ${tsType}`);
    }

    if (hasBody) {
      const bodyType = schemaToTypeString(op.requestBody, importTypes);
      fnParams.push(`data: ${bodyType}`);
    }

    if (hasQuery) {
      fnParams.push(`params${queryParams.every((p) => p.required) ? '' : '?'}: ${paramsTypeName}`);

      const props = queryParams.map((qp) => {
        const tsType = schemaToTypeString(qp.schema, importTypes);
        return `  ${qp.name}${qp.required ? '' : '?'}: ${tsType};`;
      }).join('\n');
      extraTypes.push(`export interface ${paramsTypeName} {\n${props}\n}`);
    }

    fnParams.push('signal?: AbortSignal');

    const bodyExpr = hasBody ? 'JSON.stringify(data)' : 'undefined';

    const pathTemplate = op.path.replace(/\{(\w+)\}/g, '${encodeURIComponent($1)}');

    let queryString = '';
    if (hasQuery) {
      queryString = `
    const _query = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
      )
    ).toString() : '';`;
    }

    const responseSchema = op.responses.find((r) => r.status === '200' || r.status === '201');
    const defaultSchema = op.responses.find((r) => r.status === 'default');
    const successSchema = responseSchema || defaultSchema;
    let returnType: string;

    const is204 = op.responses.some((r) => r.status === '204');

    if (is204) {
      returnType = 'void';
    } else if (successSchema?.schema) {
      returnType = schemaToTypeString(successSchema.schema, importTypes);
    } else {
      returnType = 'void';
    }

    const method = op.method.toLowerCase();
    const needsContentType = method !== 'get' && method !== 'head';

    methods.push(`  async ${methodName}(${fnParams.join(', ')}): Promise<${returnType}> {${queryString}
    const _headers: Record<string, string> = { ...this.#headers };
    if (this.#contentType && !_headers['Content-Type']) {
      _headers['Content-Type'] = this.#contentType;
    }
    const response = await this.#fetch(\`\${this.#baseUrl}${pathTemplate}${hasQuery ? '${_query}' : ''}\`, {
      method: '${op.method}',
      headers: _headers,
      body: ${bodyExpr},
      signal,
    });
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    ${is204 ? '' : `if (response.status === 204) return undefined as unknown as ${returnType};`}
    ${returnType !== 'void' ? 'return response.json() as Promise<' + returnType + '>;' : ''}
  }`);
  }

  const filteredTypes = Array.from(importTypes).filter(Boolean);
  const importStmt = filteredTypes.length > 0
    ? `import type { ${filteredTypes.join(', ')} } from './types.js';`
    : '';

  const extraTypesCode = extraTypes.length > 0 ? '\n' + extraTypes.join('\n\n') + '\n' : '';

  const code = `${importStmt}

export class ApiError extends Error {
  public status: number;
  public body: string;

  constructor(status: number, body: string, message?: string) {
    super(message ?? \`HTTP \${status}\`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class ${clientName} {
  readonly #baseUrl: string;
  readonly #headers: Record<string, string>;
  readonly #fetch: typeof globalThis.fetch;
  readonly #contentType: string | undefined;

  constructor(config: {
    baseUrl: string;
    headers?: Record<string, string>;
    fetch?: typeof globalThis.fetch;
  }) {
    this.#baseUrl = config.baseUrl.replace(/\\/+$/, '');
    this.#headers = { ...config.headers };
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#contentType = this.#headers['Content-Type'] ?? 'application/json';
  }

${methods.join('\n\n')}
}
${extraTypesCode}`;

  return { code };
}
