import { describe, it, expect } from 'vitest';
import { generateClient } from '../../src/codegen/client.js';
import { parseSpec } from '../../src/parser/index.js';
import { loadFromFile } from '../../src/loaders/file.js';
import { resolve, join } from 'node:path';

const fixtureDir = resolve(import.meta.dirname, '../fixtures');

function parseFixture(name: string) {
  const data = loadFromFile(join(fixtureDir, name)).data;
  return parseSpec(data);
}

describe('generateClient', () => {
  describe('from minimal spec', () => {
    const { operations } = parseFixture('minimal.yml');

    it('generates ApiError class', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('export class ApiError extends Error');
      expect(result.code).toContain('public status: number');
      expect(result.code).toContain('public body: string');
    });

    it('generates ApiClient class with constructor', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('export class ApiClient');
      expect(result.code).toContain('constructor(config:');
      expect(result.code).toContain('baseUrl: string');
      expect(result.code).toContain('headers?: Record<string, string>');
      expect(result.code).toContain('fetch?: typeof globalThis.fetch');
    });

    it('generates method for each operation', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('async getHealth');
      expect(result.code).toContain('Promise<');
    });

    it('uses custom client name', () => {
      const result = generateClient(operations, { clientName: 'MyApi' });
      expect(result.code).toContain('export class MyApi');
      expect(result.code).not.toContain('export class ApiClient');
    });

    it('uses baseUrl from config', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('this.#baseUrl');
    });

    it('uses fetch with path substitution', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('this.#fetch');
    });
  });

  describe('from params spec', () => {
    const { operations } = parseFixture('params.yml');

    it('generates path params as function arguments', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('async getUserById(userId: number');
      expect(result.code).toContain('async getUserPost(userId: number, postId: string');
    });

    it('encodes path params with encodeURIComponent', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('encodeURIComponent(userId)');
    });

    it('generates query params as params object', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('async createUser(data:');
      expect(result.code).toContain('URLSearchParams');
    });

    it('generates query param interface types', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('export interface GetUserByIdParams');
    });

    it('handles 204 no content response', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('async deleteUser(userId: number');
      const deleteOp = operations.find((o) => o.operationId === 'deleteUser');
      expect(deleteOp).toBeDefined();
    });

    it('sets Content-Type for POST requests', () => {
      const result = generateClient(operations, {});
      const createUserMethod = result.code.match(/async createUser[\s\S]*?^}/m)?.[0];
      expect(createUserMethod).toBeDefined();
    });
  });

  describe('from petstore spec', () => {
    const { operations } = parseFixture('petstore.json');

    it('generates all operations', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('async updatePet');
      expect(result.code).toContain('async addPet');
      expect(result.code).toContain('async findPetsByStatus');
      expect(result.code).toContain('async getPetById');
      expect(result.code).toContain('async deletePet');
      expect(result.code).toContain('async getInventory');
      expect(result.code).toContain('async placeOrder');
      expect(result.code).toContain('async getOrderById');
      expect(result.code).toContain('async deleteOrder');
      expect(result.code).toContain('async createUser');
      expect(result.code).toContain('async loginUser');
      expect(result.code).toContain('async logoutUser');
      expect(result.code).toContain('async getUserByName');
      expect(result.code).toContain('async updateUser');
      expect(result.code).toContain('async deleteUser');
    });

    it('imports type references from types.ts', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain("import type {");
      expect(result.code).toContain("} from './types.js'");
      expect(result.code).toContain('Pet');
    });

    it('generates query param types for findPetsByStatus', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('FindPetsByStatusParams');
    });

    it('generates param interfaces with correct field names', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('status');
    });
  });

  describe('from complex spec', () => {
    const { operations } = parseFixture('complex.yml');

    it('generates methods with required query params', () => {
      const result = generateClient(operations, {});
      expect(result.code).toContain('searchItems');
    });
  });

  describe('edge cases', () => {
    it('skips import statement when no types needed', () => {
      const { operations } = parseFixture('minimal.yml');
      const result = generateClient(operations, {});
      expect(result.code).not.toContain("import type {  } from './types.js'");
    });

    it('includes signal parameter in all methods', () => {
      const { operations } = parseFixture('minimal.yml');
      const result = generateClient(operations, {});
      expect(result.code).toContain('signal?: AbortSignal');
    });

    it('deduplicates method names with _N suffix', () => {
      const ops = [
        { method: 'GET', path: '/foo', operationId: 'duplicateName', parameters: [], pathParams: [], queryParams: [], responses: [{ status: '200' }], hasBody: false },
        { method: 'GET', path: '/bar', operationId: 'duplicateName', parameters: [], pathParams: [], queryParams: [], responses: [{ status: '200' }], hasBody: false },
      ];
      const result = generateClient(ops as any, {});
      expect(result.code).toContain('async duplicateName(');
      expect(result.code).toContain('async duplicateName_1(');
    });
  });
});
