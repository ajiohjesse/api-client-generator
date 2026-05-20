import { describe, it, expect } from 'vitest';
import { resolveRef, resolveSchema } from '../../src/parser/resolver.js';
import type { SchemaObject } from '../../src/types.js';

describe('resolveRef', () => {
  const root = {
    components: {
      schemas: {
        Pet: { type: 'object', properties: { name: { type: 'string' } } },
        Tag: { type: 'object', properties: { id: { type: 'integer' } } },
      },
    },
  };

  it('resolves a valid local ref', () => {
    const result = resolveRef('#/components/schemas/Pet', root);
    expect(result).toEqual({ type: 'object', properties: { name: { type: 'string' } } });
  });

  it('resolves a nested ref', () => {
    const result = resolveRef('#/components/schemas/Tag', root);
    expect(result).toEqual({ type: 'object', properties: { id: { type: 'integer' } } });
  });

  it('throws on non-existent ref', () => {
    expect(() => resolveRef('#/components/schemas/Nonexistent', root)).toThrow();
  });

  it('throws on external ref', () => {
    expect(() => resolveRef('./other.yaml#/components/schemas/Pet', root)).toThrow();
  });
});

describe('resolveSchema', () => {
  const root = {
    components: {
      schemas: {
        Pet: { type: 'object', properties: { name: { type: 'string' } } },
        Tag: { type: 'object', properties: { id: { type: 'integer' } } },
        Category: { type: 'object', properties: { name: { type: 'string' } } },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'integer' },
          },
        },
      },
    },
  };

  it('resolves a schema with $ref', () => {
    const schema: SchemaObject = { $ref: '#/components/schemas/Pet' };
    const result = resolveSchema(schema, root);
    expect(result.type).toBe('object');
    expect(result.properties?.name).toEqual({ type: 'string' });
  });

  it('preserves $ref in allOf items for codegen detection', () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: '#/components/schemas/Pet' },
        { type: 'object', properties: { breed: { type: 'string' } } },
      ],
    };
    const result = resolveSchema(schema, root);
    expect(result.allOf).toBeDefined();
    expect(result.allOf!.length).toBe(2);
    expect(result.allOf![0].$ref).toBe('#/components/schemas/Pet');
  });

  it('preserves $ref in properties for codegen', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        category: { $ref: '#/components/schemas/Category' },
      },
    };
    const result = resolveSchema(schema, root);
    expect(result.properties?.category).toBeDefined();
    expect((result.properties?.category as SchemaObject).$ref).toBe('#/components/schemas/Category');
  });

  it('handles nullable in combination with $ref', () => {
    const schema: SchemaObject = {
      nullable: true,
      $ref: '#/components/schemas/Category',
    };
    const result = resolveSchema(schema, root);
    expect(result.nullable).toBe(true);
    expect(result.type).toBe('object');
  });

  it('handles circular refs gracefully', () => {
    const circularRoot = {
      components: {
        schemas: {
          TreeNode: {
            type: 'object',
            properties: {
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/TreeNode' },
              },
            },
          },
        },
      },
    };

    const schema: SchemaObject = { $ref: '#/components/schemas/TreeNode' };
    const result = resolveSchema(schema, circularRoot, new Set(), 0, 3);
    expect(result).toBeDefined();
  });

  it('preserves $ref in array items for codegen', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: { $ref: '#/components/schemas/Tag' },
    };
    const result = resolveSchema(schema, root);
    expect(result.items?.$ref).toBe('#/components/schemas/Tag');
  });

  it('preserves $ref in additionalProperties for codegen', () => {
    const schema: SchemaObject = {
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/Tag' },
    };
    const result = resolveSchema(schema, root);
    const addProps = result.additionalProperties as SchemaObject;
    expect(addProps.$ref).toBe('#/components/schemas/Tag');
  });
});
