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

  it('renders oneOf as a union of collected references', () => {
    const result = renderClientType({
      oneOf: [{ _sourceName: 'ValidationError' }, { _sourceName: 'SystemError' }],
    });

    expect(result.type).toBe('ValidationError | SystemError');
    expect(result.refs).toEqual(['ValidationError', 'SystemError']);
  });
});
