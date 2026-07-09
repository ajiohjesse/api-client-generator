# API Client Generator

Generates a fully typesafe fetch-based API client from an OpenAPI 3.x specification.

## Language

**OpenAPI Spec**:
An API description document (JSON or YAML) conforming to OpenAPI 3.0 or 3.1 from which a client is generated.
_Avoid_: Swagger, API definition, API schema

**Generated Client**:
The TypeScript output produced by the generator — three files (`types.ts`, `client.ts`, `index.ts`) that together form a typesafe API client.
_Avoid_: Output, artifact

**Operation**:
A single API endpoint identified by an HTTP method and path, with typed parameters and responses.
_Avoid_: Endpoint, route, API call

**Loader**:
Reads an OpenAPI spec from a file path or URL, parsing JSON or YAML content.
_Avoid_: Reader, importer

**Parser**:
Validates and normalizes the raw spec into resolved operations and component schemas, handling `$ref` resolution and circular references.
_Avoid_: Analyzer, interpreter

**Codegen**:
Produces TypeScript source files from parsed operations and schemas — generates types, client class, and barrel exports.
_Avoid_: Generator, emitter, writer

**CLI**:
The command-line entry point that wires the loader, parser, and codegen together into a single `generate` command.
_Avoid_: Command line, terminal app
