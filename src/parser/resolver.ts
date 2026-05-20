import type { SchemaObject } from '../types.js';

export function resolveRef(ref: string, root: unknown): unknown {
  if (!ref.startsWith('#/')) {
    throw new Error(`Cannot resolve external ref: ${ref}`);
  }

  const parts = ref.replace('#/', '').split('/');
  let current: unknown = root;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      throw new Error(`Cannot resolve ref ${ref}: path part '${part}' not found`);
    }
    const obj = current as Record<string, unknown>;
    if (!(part in obj)) {
      throw new Error(`Cannot resolve ref ${ref}: path part '${part}' not found`);
    }
    current = obj[part];
  }

  return current;
}

export function resolveSchema(
  schema: SchemaObject,
  root: unknown,
  visited: Set<string> = new Set(),
  depth: number = 0,
  maxDepth: number = 10
): SchemaObject {
  if (depth > maxDepth) {
    return { type: 'object', description: 'Circular reference - truncated' };
  }

  if (schema.$ref) {
    if (visited.has(schema.$ref)) {
      return { type: 'object', description: 'Circular reference - truncated' };
    }
    visited.add(schema.$ref);
    const resolved = resolveRef(schema.$ref, root) as SchemaObject;
    const result = resolveSchema(resolved, root, new Set(visited), depth + 1, maxDepth);

    if (schema.nullable) {
      result.nullable = true;
    }
    return result;
  }

  const result: SchemaObject = { ...schema };
  delete (result as Record<string, unknown>).$ref;

  if (result.allOf) {
    result.allOf = result.allOf.map((s) => s.$ref ? s : resolveSchema(s, root, new Set(visited), depth + 1, maxDepth));
  }

  if (result.oneOf) {
    result.oneOf = result.oneOf.map((s) => s.$ref ? s : resolveSchema(s, root, new Set(visited), depth + 1, maxDepth));
  }

  if (result.anyOf) {
    result.anyOf = result.anyOf.map((s) => s.$ref ? s : resolveSchema(s, root, new Set(visited), depth + 1, maxDepth));
  }

  if (result.items && !result.items.$ref) {
    result.items = resolveSchema(result.items, root, new Set(visited), depth + 1, maxDepth);
  }

  if (result.properties) {
    const resolvedProps: Record<string, SchemaObject> = {};
    for (const [key, prop] of Object.entries(result.properties)) {
      resolvedProps[key] = prop.$ref ? prop : resolveSchema(prop, root, new Set(visited), depth + 1, maxDepth);
    }
    result.properties = resolvedProps;
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object' && !(result.additionalProperties as SchemaObject).$ref) {
    result.additionalProperties = resolveSchema(
      result.additionalProperties as SchemaObject,
      root,
      new Set(visited),
      depth + 1,
      maxDepth
    );
  }

  return result;
}
