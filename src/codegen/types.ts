import type { SchemaObject } from '../types.js';
import { renderTypeDeclaration } from './schema-to-type.js';

export interface GeneratedTypes {
  imports: string;
  types: string;
}

/**
 * Generate component type declarations.
 * Rendering policy lives in the Schema-to-Type module; this only orchestrates.
 */
export function generateTypes(schemas: Record<string, SchemaObject>): GeneratedTypes {
  const typeLines: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    typeLines.push(renderTypeDeclaration(name, schema, schemas));
  }

  return {
    imports: '',
    types: typeLines.join('\n\n'),
  };
}
