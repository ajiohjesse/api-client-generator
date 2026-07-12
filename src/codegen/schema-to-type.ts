import type { SchemaObject } from '../types.js';
import { toTypeName } from '../naming.js';

/** Internal rendering policy — not part of the purpose-facing declaration or client interfaces. */
type SchemaTypeStrategy = {
  refMode: 'import' | 'lookup';
  onRef?: (name: string) => void;
  schemas?: Record<string, SchemaObject>;
  includeDescriptions: boolean;
  allOfMode: 'intersection' | 'extends-detect';
};

function formatDescription(description?: string, indent: string = ''): string {
  if (!description) return '';
  const lines = description.split('\n').map((l) => `${indent} * ${l}`).join('\n');
  return `${indent}/**\n${lines}\n${indent} */`;
}

function declarationStrategy(schemas: Record<string, SchemaObject>): SchemaTypeStrategy {
  return {
    refMode: 'lookup',
    schemas,
    includeDescriptions: true,
    allOfMode: 'extends-detect',
  };
}

function clientStrategy(onRef: (name: string) => void): SchemaTypeStrategy {
  return {
    refMode: 'import',
    onRef,
    includeDescriptions: false,
    allOfMode: 'intersection',
  };
}

/**
 * Purpose-facing declaration rendering path.
 * Owns descriptions, nullable handling, allOf extends detection, and
 * interface-vs-type choice so callers never assemble rendering policy.
 */
export function renderTypeDeclaration(
  name: string,
  schema: SchemaObject,
  schemas: Record<string, SchemaObject>
): string {
  const typeName = toTypeName(name);
  const schemaClean: SchemaObject = { ...schema };
  delete (schemaClean as { _sourceName?: string })._sourceName;

  const desc = formatDescription(schema.description);
  const strategy = declarationStrategy(schemas);
  const typeDef = schemaToType(schemaClean, strategy, '');

  const withDesc = (declaration: string): string =>
    desc ? `${desc}\n\n${declaration}` : declaration;

  if (schema.allOf && schema.allOf.length > 0 && !schema.nullable) {
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
      return withDesc(`export interface ${typeName} extends ${extendsParts.join(', ')} {}`);
    }
    if (extendsParts.length > 0) {
      const ownSchema: SchemaObject = { type: 'object', properties: ownProps, required: schema.required };
      const mergedType = schemaToType(ownSchema, strategy, '');
      return withDesc(`export interface ${typeName} extends ${extendsParts.join(', ')} ${mergedType}`);
    }
    return withDesc(`export type ${typeName} = ${typeDef};`);
  }

  if (schema.oneOf || schema.anyOf) {
    return withDesc(`export type ${typeName} = ${typeDef};`);
  }

  // Nullable object shapes must be type aliases — `interface X {…} | null` is invalid TS.
  if ((schema.type === 'object' || schema.properties) && schema.properties && !schema.nullable) {
    return withDesc(`export interface ${typeName} ${typeDef}`);
  }

  return withDesc(`export type ${typeName} = ${typeDef};`);
}

export interface ClientTypeRenderResult {
  type: string;
  refs: readonly string[];
}

/**
 * Purpose-facing Generated Client type rendering path.
 * Owns import-mode reference collection, intersection allOf, and no-description
 * policy so callers receive rendered text and refs — not strategy flags or callbacks.
 */
export function renderClientType(schema: SchemaObject | undefined): ClientTypeRenderResult {
  if (!schema) return { type: 'void', refs: [] };

  const refs = new Set<string>();
  return {
    type: schemaToType(schema, clientStrategy((name) => refs.add(name))),
    refs: Array.from(refs),
  };
}

function schemaToType(
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
    const union = parts.join(' | ');
    return union;
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
          const propDesc = formatDescription(prop.description, indent + '  ');
          if (propDesc) lines.push(propDesc);
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
