import { describe, it, expect } from 'vitest';
import { parseSpec } from '../../src/parser/index.js';
import { loadFromFile } from '../../src/loaders/file.js';
import { resolve, join } from 'node:path';

const fixtureDir = resolve(import.meta.dirname, '../fixtures');

function loadFixture(name: string): unknown {
  return loadFromFile(join(fixtureDir, name)).data;
}

describe('parseSpec', () => {
  it('parses the minimal spec', () => {
    const data = loadFixture('minimal.yml');
    const { operations } = parseSpec(data);
    expect(operations.length).toBe(1);
    expect(operations[0].method).toBe('GET');
    expect(operations[0].path).toBe('/health');
    expect(operations[0].operationId).toBe('getHealth');
  });

  it('parses the params spec', () => {
    const data = loadFixture('params.yml');
    const { operations } = parseSpec(data);
    expect(operations.length).toBe(4);

    const getUserById = operations.find((o) => o.operationId === 'getUserById');
    expect(getUserById).toBeDefined();
    expect(getUserById!.pathParams.length).toBe(1);
    expect(getUserById!.pathParams[0].name).toBe('userId');
    expect(getUserById!.queryParams.length).toBe(2);
    expect(getUserById!.queryParams.map((p) => p.name)).toEqual(['include', 'page']);

    const getUserPost = operations.find((o) => o.operationId === 'getUserPost');
    expect(getUserPost).toBeDefined();
    expect(getUserPost!.pathParams.length).toBe(2);
    expect(getUserPost!.pathParams.map((p) => p.name)).toEqual(['userId', 'postId']);

    const createUser = operations.find((o) => o.operationId === 'createUser');
    expect(createUser).toBeDefined();
    expect(createUser!.hasBody).toBe(true);
    expect(createUser!.requestBody).toBeDefined();

    const deleteUser = operations.find((o) => o.operationId === 'deleteUser');
    expect(deleteUser).toBeDefined();
    expect(deleteUser!.method).toBe('DELETE');
  });

  it('parses the schemas spec', () => {
    const data = loadFixture('schemas.yml');
    const { operations, schemas } = parseSpec(data);
    expect(operations.length).toBe(1);
    expect(Object.keys(schemas).length).toBeGreaterThanOrEqual(10);
    expect(schemas['Item']).toBeDefined();
    expect(schemas['Item'].properties?.status?.enum).toEqual(['active', 'inactive', 'archived']);
    expect(schemas['Pet']).toBeDefined();
    expect(schemas['_Error']).toBeDefined();
    expect(schemas['_Error'].oneOf).toBeDefined();
    expect(schemas['TreeNode']).toBeDefined();
    expect(schemas['EmptySchema']).toBeDefined();
  });

  it('parses the complex spec', () => {
    const data = loadFixture('complex.yml');
    const { operations } = parseSpec(data);
    expect(operations.length).toBe(2);

    const search = operations.find((o) => o.operationId === 'searchItems');
    expect(search).toBeDefined();
    expect(search!.queryParams.length).toBe(2);

    const nested = operations.find((o) => o.operationId === 'getNested');
    expect(nested).toBeDefined();
  });

  it('parses the petstore spec', () => {
    const data = loadFixture('petstore.json');
    const { operations, schemas } = parseSpec(data);
    expect(operations.length).toBeGreaterThan(10);
    expect(schemas['Pet']).toBeDefined();
    expect(schemas['Order']).toBeDefined();
    expect(schemas['User']).toBeDefined();
    expect(schemas['Tag']).toBeDefined();

    const getPetById = operations.find((o) => o.operationId === 'getPetById');
    expect(getPetById).toBeDefined();
    expect(getPetById!.pathParams[0].name).toBe('petId');

    const addPet = operations.find((o) => o.operationId === 'addPet');
    expect(addPet).toBeDefined();
    expect(addPet!.hasBody).toBe(true);

    const findPets = operations.find((o) => o.operationId === 'findPetsByStatus');
    expect(findPets).toBeDefined();
    expect(findPets!.queryParams.length).toBe(1);
  });

  it('throws on invalid spec - missing openapi field', () => {
    expect(() => parseSpec({})).toThrow('openapi');
  });

  it('throws on invalid spec - missing paths', () => {
    expect(() => parseSpec({ openapi: '3.0.3' })).toThrow('paths');
  });

  it('extracts response schemas', () => {
    const data = loadFixture('minimal.yml');
    const { operations } = parseSpec(data);
    expect(operations[0].responses.length).toBeGreaterThanOrEqual(1);
    expect(operations[0].responses[0].status).toBe('200');
    expect(operations[0].responses[0].schema).toBeDefined();
  });
});
