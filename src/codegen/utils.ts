import {
  toPascalCase,
  toCamelCase,
  sanitizeIdentifier,
  toTypeName,
  schemaTypeName,
} from '../naming.js';

export {
  toPascalCase,
  toCamelCase,
  sanitizeIdentifier,
  toTypeName,
  schemaTypeName,
};

export function operationMethodName(operationId: string, method: string, path: string): string {
  if (operationId) {
    return toCamelCase(sanitizeIdentifier(operationId));
  }
  return `${method.toLowerCase()}${pathToMethodSuffix(path)}`;
}

function pathToMethodSuffix(path: string): string {
  const segments = path
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean);
  return segments.map((s) => toPascalCase(s)).join('');
}

export function buildParamTypeName(operationId: string, method: string, path: string): string {
  const base = operationId
    ? toPascalCase(sanitizeIdentifier(operationId))
    : `${method.toUpperCase()}${pathToMethodSuffix(path)}`;
  return `${base}Params`;
}

export function buildResponseTypeName(operationId: string, method: string, path: string): string {
  const base = operationId
    ? toPascalCase(sanitizeIdentifier(operationId))
    : `${method.toUpperCase()}${pathToMethodSuffix(path)}`;
  return `${base}Response`;
}
