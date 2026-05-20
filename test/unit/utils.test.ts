import { describe, it, expect } from 'vitest';
import {
  toPascalCase,
  toCamelCase,
  sanitizeIdentifier,
  toTypeName,
  operationMethodName,
  buildParamTypeName,
  buildResponseTypeName,
} from '../../src/codegen/utils.js';

describe('toPascalCase', () => {
  it('converts simple words', () => {
    expect(toPascalCase('hello')).toBe('Hello');
    expect(toPascalCase('hello_world')).toBe('HelloWorld');
    expect(toPascalCase('hello-world')).toBe('HelloWorld');
    expect(toPascalCase('hello world')).toBe('HelloWorld');
  });

  it('handles mixed separators', () => {
    expect(toPascalCase('get_user_by_id')).toBe('GetUserById');
    expect(toPascalCase('findPetsByStatus')).toBe('FindPetsByStatus');
  });

  it('handles empty string', () => {
    expect(toPascalCase('')).toBe('');
  });

  it('handles single character', () => {
    expect(toPascalCase('a')).toBe('A');
  });
});

describe('toCamelCase', () => {
  it('converts pascal to camel', () => {
    expect(toCamelCase('HelloWorld')).toBe('helloWorld');
  });

  it('handles single word', () => {
    expect(toCamelCase('Hello')).toBe('hello');
  });
});

describe('sanitizeIdentifier', () => {
  it('replaces special chars with underscore', () => {
    expect(sanitizeIdentifier('hello-world')).toBe('hello_world');
    expect(sanitizeIdentifier('foo.bar')).toBe('foo_bar');
    expect(sanitizeIdentifier('foo@bar')).toBe('foo_bar');
  });

  it('prefixes leading digits with underscore', () => {
    expect(sanitizeIdentifier('123abc')).toBe('_123abc');
  });

  it('prefixes reserved words with underscore', () => {
    expect(sanitizeIdentifier('class')).toBe('_class');
    expect(sanitizeIdentifier('interface')).toBe('_interface');
    expect(sanitizeIdentifier('string')).toBe('_string');
    expect(sanitizeIdentifier('export')).toBe('_export');
  });

  it('allows valid identifiers', () => {
    expect(sanitizeIdentifier('hello')).toBe('hello');
    expect(sanitizeIdentifier('userName')).toBe('userName');
    expect(sanitizeIdentifier('user_name')).toBe('user_name');
  });
});

describe('toTypeName', () => {
  it('converts to pascal case identifier', () => {
    expect(toTypeName('user_profile')).toBe('UserProfile');
    expect(toTypeName('pet')).toBe('Pet');
    expect(toTypeName('order-item')).toBe('OrderItem');
  });

  it('handles reserved words', () => {
    expect(toTypeName('class')).toBe('_Class');
  });
});

describe('operationMethodName', () => {
  it('uses operationId when available', () => {
    expect(operationMethodName('getPetById', 'GET', '/pet/{petId}')).toBe('getPetById');
    expect(operationMethodName('createUser', 'POST', '/users')).toBe('createUser');
  });

  it('falls back to method + path', () => {
    const result = operationMethodName('', 'GET', '/users/{id}');
    expect(result).toBe('getUsersId');
  });
});

describe('buildParamTypeName', () => {
  it('builds from operationId', () => {
    expect(buildParamTypeName('findPetsByStatus', 'GET', '/pet/findByStatus')).toBe('FindPetsByStatusParams');
  });

  it('falls back to method + path', () => {
    const result = buildParamTypeName('', 'GET', '/users');
    expect(result).toBe('GETUsersParams');
  });
});

describe('buildResponseTypeName', () => {
  it('builds from operationId', () => {
    expect(buildResponseTypeName('getPetById', 'GET', '/pet/{petId}')).toBe('GetPetByIdResponse');
  });
});
