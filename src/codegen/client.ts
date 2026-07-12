import type { ParsedOperation, SchemaObject } from '../types.js';
import { renderClientType } from './schema-to-type.js';
import {
  operationMethodName,
  buildParamTypeName,
} from './utils.js';

function renderMethodType(schema: SchemaObject | undefined, importTypes: Set<string>): string {
  const { type, refs } = renderClientType(schema);
  for (const ref of refs) importTypes.add(ref);
  return type;
}

export interface GeneratedClient {
  code: string;
}

export function generateClient(
  operations: ParsedOperation[],
  options: { clientName?: string; serverUrl?: string }
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
      const tsType = renderMethodType(pp.schema, importTypes);
      fnParams.push(`${pp.name}: ${tsType}`);
    }

    if (hasBody) {
      const bodyType = renderMethodType(op.requestBody, importTypes);
      fnParams.push(`data: ${bodyType}`);
    }

    if (hasQuery) {
      fnParams.push(`params${queryParams.every((p) => p.required) ? '' : '?'}: ${paramsTypeName}`);

      const props = queryParams.map((qp) => {
        const tsType = renderMethodType(qp.schema, importTypes);
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
      returnType = renderMethodType(successSchema.schema, importTypes);
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

  const serverUrlStr = options.serverUrl ? `'${options.serverUrl}'` : "''";
  const baseUrlDesc = options.serverUrl
    ? `    /** Default base URL from the OpenAPI spec's servers[0]; override via config. */\n`
    : `    /** Base URL for all requests; must be provided via config. */\n`;

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
${baseUrlDesc}    baseUrl?: string;
    headers?: Record<string, string>;
    fetch?: typeof globalThis.fetch;
  }) {
    this.#baseUrl = (config.baseUrl ?? ${serverUrlStr}).replace(/\\/+$/, '');
    this.#headers = { ...config.headers };
    this.#fetch = config.fetch ?? globalThis.fetch;
    this.#contentType = this.#headers['Content-Type'] ?? 'application/json';
  }

${methods.join('\n\n')}
}
${extraTypesCode}`;

  return { code };
}
