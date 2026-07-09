export interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface PathItem {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
  patch?: OperationObject;
  options?: OperationObject;
  head?: OperationObject;
  trace?: OperationObject;
  parameters?: ParameterObject[];
}

export interface OperationObject {
  operationId?: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  tags?: string[];
}

export interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

export interface RequestBodyObject {
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  enum?: (string | number)[];
  nullable?: boolean;
  required?: string[];
  additionalProperties?: SchemaObject | boolean;
  description?: string;
  format?: string;
  default?: unknown;
  discriminator?: DiscriminatorObject;
  /** Set by resolver when a $ref is fully resolved — codegen uses this instead of parsing $ref strings */
  _sourceName?: string;
}

export interface DiscriminatorObject {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface ParsedOperation {
  method: string;
  path: string;
  operationId: string;
  parameters: ParameterObject[];
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  requestBody?: SchemaObject;
  responses: ParsedResponse[];
  hasBody: boolean;
}

export interface ParsedResponse {
  status: string;
  schema?: SchemaObject;
}

export interface GeneratorOptions {
  clientName?: string;
  output: string;
}
