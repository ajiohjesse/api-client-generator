import { parseSpec } from '../parser/index.js';
import { generateTypes } from './types.js';
import { generateClient } from './client.js';
import type { GeneratorOptions } from '../types.js';

export interface GenerateResult {
  typesCode: string;
  clientCode: string;
  indexCode: string;
}

export function generate(spec: unknown, options: GeneratorOptions): GenerateResult {
  const { operations, schemas } = parseSpec(spec);

  const { types } = generateTypes(schemas);
  const typesCode = types;

  const { code: clientCode } = generateClient(operations, {
    clientName: options.clientName,
  });

  const clientName = options.clientName || 'ApiClient';
  const indexCode = `export { ${clientName} } from './client.js';\nexport { ApiError } from './client.js';\nexport type * from './types.js';\n`;

  return { typesCode, clientCode, indexCode };
}
