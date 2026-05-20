import type { SchemaObject } from '../types.js';
import { toTypeName, schemaTypeName } from './utils.js';

function formatDescription(description?: string, indent: string = ''): string {
  if (!description) return '';
  const lines = description.split('\n').map((l) => `${indent} * ${l}`).join('\n');
  return `${indent}/**\n${lines}\n${indent} */\n`;
}

function schemaToType(schema: SchemaObject, schemas: Record<string, SchemaObject>, indent: string = ''): string {
  if (schema.nullable) {
    const inner = schemaToType({ ...schema, nullable: false }, schemas, indent);
    return `${inner} | null`;
  }

  if (schema.allOf && schema.allOf.length > 0) {
    if (schema.allOf.length === 1) {
      return schemaToType(schema.allOf[0], schemas, indent);
    }
    const parts = schema.allOf.map((s) => schemaToType(s, schemas, indent));
    return parts.join(' & ');
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const parts = schema.oneOf.map((s) => schemaToType(s, schemas, indent));
    return parts.join(' | ');
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const parts = schema.anyOf.map((s) => schemaToType(s, schemas, indent));
    return parts.join(' | ');
  }

  if (schema.$ref) {
    const refName = schemaTypeName(schema);
    if (refName && schemas[refName]) {
      return refName;
    }
    return 'unknown';
  }

  if (schema.enum) {
    const values = schema.enum.map((v) => {
      if (typeof v === 'string') return `'${v}'`;
      return String(v);
    });
    return values.join(' | ');
  }

  const type = schema.type;

  if (type === 'array') {
    if (schema.items) {
      const itemType = schemaToType(schema.items, schemas, indent);
      return `${itemType}[]`;
    }
    return 'unknown[]';
  }

  if (type === 'object' || (schema.properties)) {
    if (!schema.properties && !schema.additionalProperties) {
      return 'Record<string, never>';
    }

    const lines: string[] = ['{'];

    if (schema.properties) {
      const requiredSet = new Set(schema.required || []);
      for (const [key, prop] of Object.entries(schema.properties)) {
        const desc = formatDescription(prop.description, indent + '  ');
        if (desc) lines.push(desc);
        const optional = requiredSet.has(key) ? '' : '?';
        const propType = schemaToType(prop, schemas, indent + '  ');
        lines.push(`${indent}  ${key}${optional}: ${propType};`);
      }
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const valueType = schemaToType(schema.additionalProperties, schemas, indent + '  ');
      lines.push(`${indent}  [key: string]: ${valueType};`);
    } else if (schema.additionalProperties === true) {
      lines.push(`${indent}  [key: string]: unknown;`);
    }

    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  switch (type) {
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

export interface GeneratedTypes {
  imports: string;
  types: string;
}

export function generateTypes(schemas: Record<string, SchemaObject>): GeneratedTypes {
  const typeLines: string[] = [];

  for (const [name, schema] of Object.entries(schemas)) {
    const typeName = toTypeName(name);
    const desc = formatDescription(schema.description);
    const typeDef = schemaToType(schema, schemas, '');

    if (schema.allOf && schema.allOf.length > 0) {
      const extendsParts: string[] = [];
      const ownProps: Record<string, SchemaObject> = {};

      for (const sub of schema.allOf) {
        if (sub.$ref) {
          const refName = schemaTypeName(sub);
          if (refName) extendsParts.push(refName);
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
        const mergedType = schemaToType(ownSchema, schemas, '');
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
