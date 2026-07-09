import type { SchemaObject } from '../types.js';
import { schemaToType, formatDescription } from './schema-to-type.js';
import type { SchemaTypeStrategy } from './schema-to-type.js';
import { toTypeName } from './utils.js';

function schemaToTypeLocal(schema: SchemaObject, schemas: Record<string, SchemaObject>, indent: string = ''): string {
  const strategy: SchemaTypeStrategy = {
    refMode: 'lookup',
    schemas,
    includeDescriptions: true,
    allOfMode: 'extends-detect',
  };
  return schemaToType(schema, strategy, indent);
}

export interface GeneratedTypes {
  imports: string;
  types: string;
}

export function generateTypes(schemas: Record<string, SchemaObject>): GeneratedTypes {
  const typeLines: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    const typeName = toTypeName(name);
    const desc = formatDescription(schema.description);
    const schemaClean: SchemaObject = { ...schema };
    delete (schemaClean as { _sourceName?: string })._sourceName;
    const typeDef = schemaToTypeLocal(schemaClean, schemas, '');

    if (schema.allOf && schema.allOf.length > 0) {
      const extendsParts: string[] = [];
      const ownProps: Record<string, SchemaObject> = {};

      for (const sub of schema.allOf) {
        if (sub._sourceName) {
          extendsParts.push(sub._sourceName);
        } else if (sub.properties) {
          Object.assign(ownProps, sub.properties);
        }
      }

      if (extendsParts.length > 0 && Object.keys(ownProps).length === 0) {
        if (desc) typeLines.push(desc);
        typeLines.push(`export interface ${typeName} extends ${extendsParts.join(', ')} {}`);
      } else if (extendsParts.length > 0) {
        if (desc) typeLines.push(desc);
        const ownSchema: SchemaObject = { type: 'object', properties: ownProps, required: schema.required };
        const mergedType = schemaToTypeLocal(ownSchema, schemas, '');
        typeLines.push(`export interface ${typeName} extends ${extendsParts.join(', ')} ${mergedType}`);
      } else {
        typeLines.push(`export type ${typeName} = ${typeDef};`);
      }
    } else if (schema.oneOf || schema.anyOf) {
      if (desc) typeLines.push(desc);
      typeLines.push(`export type ${typeName} = ${typeDef};`);
    } else if ((schema.type === 'object' || schema.properties) && schema.properties) {
      if (desc) typeLines.push(desc);
      typeLines.push(`export interface ${typeName} ${typeDef}`);
    } else if (schema.type === 'object' || schema.properties) {
      if (desc) typeLines.push(desc);
      typeLines.push(`export type ${typeName} = ${typeDef};`);
    } else {
      if (desc) typeLines.push(desc);
      typeLines.push(`export type ${typeName} = ${typeDef};`);
    }
  }

  return {
    imports: '',
    types: typeLines.join('\n\n'),
  };
}
