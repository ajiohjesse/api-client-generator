const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
  'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'as', 'implements',
  'interface', 'let', 'package', 'private', 'protected', 'public',
  'static', 'yield', 'any', 'boolean', 'number', 'string', 'unknown',
  'never', 'object', 'error', 'array', 'promise', 'record',
]);

export function toPascalCase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
  const parts = cleaned.split(/[_\s-]+|(?=[A-Z])/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

export function toCamelCase(name: string): string {
  if (!name) return '';
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function sanitizeIdentifier(name: string): string {
  let sanitized = name.replace(/[^a-zA-Z0-9_$]/g, '_');
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  if (RESERVED_WORDS.has(sanitized.toLowerCase())) {
    sanitized = '_' + sanitized;
  }
  return sanitized;
}

export function toTypeName(schemaName: string): string {
  return sanitizeIdentifier(toPascalCase(schemaName));
}

export function schemaTypeName(schema: { $ref?: string }): string | null {
  if (!schema.$ref) return null;
  const parts = schema.$ref.split('/');
  return toTypeName(parts[parts.length - 1]);
}
