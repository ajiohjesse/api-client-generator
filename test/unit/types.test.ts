import { describe, it, expect } from 'vitest';
import { generateTypes } from '../../src/codegen/types.js';
import { parseSpec } from '../../src/parser/index.js';
import { loadFromFile } from '../../src/loaders/file.js';
import { resolve, join } from 'node:path';

const fixtureDir = resolve(import.meta.dirname, '../fixtures');

function loadSchemas(fixture: string): Record<string, unknown> {
  const data = loadFromFile(join(fixtureDir, fixture)).data;
  const { schemas } = parseSpec(data);
  return schemas;
}

describe('generateTypes', () => {
  it('generates types from the schemas fixture', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('export interface ItemList');
    expect(result.types).toContain('export interface Item');
    expect(result.types).toContain('export interface Pet extends');
    expect(result.types).toContain('export type _Error');
    expect(result.types).toContain('export interface TreeNode');
    expect(result.types).toContain('export type EmptySchema');
  });

  it('generates enum types as union literals', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain("'active'");
    expect(result.types).toContain("'inactive'");
    expect(result.types).toContain("'archived'");
  });

  it('generates nullable types', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('| null');
  });

  it('generates array types', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('string[]');
    expect(result.types).toContain('[]');
  });

  it('generates additionalProperties as index signatures', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('[key: string]');
  });

  it('generates types for the petstore spec', () => {
    const schemas = loadSchemas('petstore.json') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('export interface Pet');
    expect(result.types).toContain('export interface Order');
    expect(result.types).toContain('export interface User');
    expect(result.types).toContain('export interface Tag');
  });

  it('generates allOf as interface extends', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('extends');
  });

  it('generates oneOf as type union', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('= ValidationError | SystemError');
  });

  it('generates anyOf as type union', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('= SuccessResponse |');
  });

  it('marks non-required fields as optional', () => {
    const schemas = loadSchemas('schemas.yml') as Record<string, any>;
    const result = generateTypes(schemas);
    expect(result.types).toContain('id?:');
    expect(result.types).toContain('name?:');
  });
});
