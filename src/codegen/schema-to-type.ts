import type { SchemaObject } from '../types.js';

export type SchemaTypeStrategy = {
  refMode: 'import' | 'lookup';
  onRef?: (name: string) => void;
  schemas?: Record<string, SchemaObject>;
  includeDescriptions: boolean;
  allOfMode: 'intersection' | 'extends-detect';
};

export function formatDescription(description?: string, indent: string = ''): string {
  if (!description) return '';
  const lines = description.split('\n').map((l) => `${indent} * ${l}`).join('\n');
  return `${indent}/**\n${lines}\n${indent} */\n`;
}

export function schemaToType(
  schema: SchemaObject,
  strategy: SchemaTypeStrategy,
  indent: string = ''
): string {
  if (schema.nullable) {
    const inner = schemaToType({ ...schema, nullable: false }, strategy, indent);
    const needsParens = inner.includes('&');
    return needsParens ? `(${inner}) | null` : `${inner} | null`;
  }

  if (schema._sourceName) {
    if (strategy.refMode === 'import') {
      strategy.onRef?.(schema._sourceName);
      return schema._sourceName;
    }
    if (strategy.schemas?.[schema._sourceName]) {
      return schema._sourceName;
    }
    return 'unknown';
  }

  if (schema.allOf && schema.allOf.length > 0) {
    if (strategy.allOfMode === 'extends-detect' && schema.allOf.length === 1) {
      return schemaToType(schema.allOf[0], strategy, indent);
    }
    const parts = schema.allOf.map((s) => schemaToType(s, strategy, indent));
    return parts.join(' & ');
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    const parts = schema.oneOf.map((s) => schemaToType(s, strategy, indent));
    return parts.join(' | ');
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    const parts = schema.anyOf.map((s) => schemaToType(s, strategy, indent));
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
      const itemType = schemaToType(schema.items, strategy, indent);
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
        if (strategy.includeDescriptions) {
          const desc = formatDescription(prop.description, indent + '  ');
          if (desc) lines.push(desc);
        }
        const optional = requiredSet.has(key) ? '' : '?';
        const propType = schemaToType(prop, strategy, indent + '  ');
        lines.push(`${indent}  ${key}${optional}: ${propType};`);
      }
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      const valueType = schemaToType(schema.additionalProperties, strategy, indent + '  ');
      lines.push(`${indent}  [key: string]: ${valueType};`);
    } else if (schema.additionalProperties === true) {
      lines.push(`${indent}  [key: string]: unknown;`);
    }

    lines.push(`${indent}}`);
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
