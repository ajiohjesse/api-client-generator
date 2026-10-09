import { describe, it, expect } from 'vitest';
import { renderClientType } from '../../src/codegen/schema-to-type.js';

describe('renderClientType', () => {
  it('renders a component reference and collects its import name', () => {
    const result = renderClientType({ _sourceName: 'Pet' });

    expect(result.type).toBe('Pet');
    expect(result.refs).toEqual(['Pet']);
  });

  it('returns void with no refs for a missing schema', () => {
    expect(renderClientType(undefined)).toEqual({ type: 'void', refs: [] });
  });

  it('renders nullable references as Type | null and still collects the import', () => {
    const result = renderClientType({ _sourceName: 'Category', nullable: true });

    expect(result.type).toBe('Category | null');
    expect(result.refs).toEqual(['Category']);
  });

  it('renders allOf as an intersection without descriptions', () => {
    const result = renderClientType({
      allOf: [
        { _sourceName: 'Item' },
        {
          type: 'object',
          properties: {
            breed: { type: 'string', description: 'Should not appear' },
          },
        },
      ],
    });

    expect(result.type).toBe('Item & {\n  breed?: string;\n}');
    expect(result.refs).toEqual(['Item']);
    expect(result.type).not.toContain('Should not appear');
  });

  it('renders arrays of references and collects the item import', () => {
    const result = renderClientType({
      type: 'array',
      items: { _sourceName: 'Pet' },
    });

    expect(result.type).toBe('Pet[]');
    expect(result.refs).toEqual(['Pet']);
  });

  it('parenthesizes a union item type so the whole union is the array element', () => {
    const result = renderClientType({
      type: 'array',
      items: {
        oneOf: [
          { type: 'object', properties: { status: { enum: ['recorded'] } }, required: ['status'] },
          { type: 'object', properties: { status: { enum: ['not_found'] } }, required: ['status'] },
        ],
      },
    });

    expect(result.type).toBe("({\n  status: 'recorded';\n} | {\n  status: 'not_found';\n})[]");
  });

  it('parenthesizes anyOf, enum, intersection, and nullable array items', () => {
    const arrayOf = (items: Parameters<typeof renderClientType>[0]) =>
      renderClientType({ type: 'array', items }).type;

    expect(arrayOf({ anyOf: [{ _sourceName: 'Cat' }, { _sourceName: 'Dog' }] })).toBe('(Cat | Dog)[]');
    expect(arrayOf({ type: 'string', enum: ['a', 'b'] })).toBe("('a' | 'b')[]");
    expect(arrayOf({ allOf: [{ _sourceName: 'Item' }, { _sourceName: 'Audit' }] })).toBe('(Item & Audit)[]');
    expect(arrayOf({ _sourceName: 'Pet', nullable: true })).toBe('(Pet | null)[]');
    expect(arrayOf({ type: 'string', nullable: true })).toBe('(string | null)[]');
  });

  it('leaves single-type array items unparenthesized', () => {
    const arrayOf = (items: Parameters<typeof renderClientType>[0]) =>
      renderClientType({ type: 'array', items }).type;

    expect(arrayOf({ type: 'string' })).toBe('string[]');
    expect(arrayOf({ type: 'string', enum: ['only'] })).toBe("'only'[]");
    expect(arrayOf({ oneOf: [{ _sourceName: 'Pet' }] })).toBe('Pet[]');
    expect(arrayOf({ type: 'array', items: { type: 'number' } })).toBe('number[][]');
    expect(arrayOf({ type: 'object', properties: { tag: { enum: ['a', 'b'] } } })).toBe(
      "{\n  tag?: 'a' | 'b';\n}[]"
    );
  });

  it('parenthesizes a union member of an intersection', () => {
    const result = renderClientType({
      allOf: [{ _sourceName: 'Base' }, { oneOf: [{ _sourceName: 'Cat' }, { _sourceName: 'Dog' }] }],
    });

    expect(result.type).toBe('Base & (Cat | Dog)');
  });

  it('renders oneOf as a union of collected references', () => {
    const result = renderClientType({
      oneOf: [{ _sourceName: 'ValidationError' }, { _sourceName: 'SystemError' }],
    });

    expect(result.type).toBe('ValidationError | SystemError');
    expect(result.refs).toEqual(['ValidationError', 'SystemError']);
  });
});
