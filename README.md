# @rehx/api-client-generator

[![npm version](https://img.shields.io/npm/v/@rehx/api-client-generator?color=blue)](https://www.npmjs.com/package/@rehx/api-client-generator)
[![CI](https://github.com/ajiohjesse/api-client-generator/actions/workflows/ci.yml/badge.svg)](https://github.com/ajiohjesse/api-client-generator/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

Generate a fully typesafe fetch-based API client from an OpenAPI 3.x spec — zero runtime dependencies.

```bash
npx @rehx/api-client-generator generate -i ./spec.yaml -o ./src/api
```

## Features

- **Zero runtime dependencies** — the generated client uses only native `fetch`
- **Full type safety** — every endpoint, request body, query param, and response is typed
- **Inline object types** — response schemas generate inline TypeScript types, not `Record<string, unknown>`
- **OpenAPI 3.0 & 3.1** — JSON and YAML, loaded from file path or URL
- **Edge cases handled** — `allOf`, `oneOf`, `anyOf`, `discriminator`, enums, nullable, circular refs, `additionalProperties`
- **Customizable** — configurable `baseUrl`, headers, custom `fetch`, `AbortSignal` for cancellation
- **Method name deduplication** — handles duplicate `operationId`s with `_N` suffices

## Install

No install needed — just run with `npx`:

```bash
npx @rehx/api-client-generator generate -i ./spec.yaml -o ./src/api
```

Or install globally:

```bash
npm install -g @rehx/api-client-generator
```

Or install locally in your project:

```bash
npm install --save-dev @rehx/api-client-generator
```

## Usage

```bash
# From a local file
npx @rehx/api-client-generator generate -i ./spec.yaml -o ./src/api

# From a URL
npx @rehx/api-client-generator generate -i https://api.example.com/openapi.json -o ./src/api

# With a custom client class name
npx @rehx/api-client-generator generate -i ./spec.yaml -o ./src/api --name MyApi
```

### Generated output

Three files are created in the output directory:

```
./src/api/
├── types.ts      # All schema types (interfaces, type aliases, unions)
├── client.ts     # The ApiClient class with typed methods
└── index.ts      # Barrel export
```

### Using the generated client

```typescript
import { ApiClient } from './src/api';

const client = new ApiClient({
  baseUrl: 'https://api.example.com/v2',
  headers: {
    Authorization: 'Bearer <token>',
  },
});

// Fully typed — IDE autocompletion works for params and return types
const users = await client.getUsers({ page: 1, limit: 50 });
const user = await client.getUser(42);
const created = await client.createUser({ name: 'Alice', email: 'alice@example.com' });

try {
  const result = await client.getUser(999);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status, error.body);
  }
}
```

### Spec-level default base URL

If your OpenAPI spec defines a `servers[0]` entry, that URL is used as the default `baseUrl` — you can override it when constructing the client.

```yaml
# spec.yaml
openapi: "3.0.3"
servers:
  - url: https://api.example.com/v2
```

```typescript
// baseUrl defaults to https://api.example.com/v2
const client = new ApiClient({});
```

### Custom fetch (e.g., auth from localStorage)

```typescript
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  fetch: (input, init) => {
    const token = localStorage.getItem('token');
    return fetch(input, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    });
  },
});
```

### Request cancellation

```typescript
const controller = new AbortController();
const promise = client.getUsers({ page: 1 }, controller.signal);
controller.abort(); // cancels the request
```

## Agent skill

Install the [gen-client](skills/gen-client/SKILL.md) skill so any compatible AI coding agent can discover and run this tool automatically:

```bash
npx skills add ajiohjesse/api-client-generator
```

Once installed, agents will know how to generate clients from OpenAPI specs, verify output, and respect the project's domain vocabulary — just mention generating an API client.

## Programmatic API

You can also use the generator programmatically:

```typescript
import { generate } from '@rehx/api-client-generator';

const spec = { /* your OpenAPI spec object */ };

const result = generate(spec, { output: './src/api' });
// result.typesCode  — string content for types.ts
// result.clientCode — string content for client.ts
// result.indexCode  — string content for index.ts
```

## Development

```bash
bun install            # Install dependencies
bun run build          # Build CLI bundle
bun run test           # Run tests
bun run test:watch     # Watch mode
bun run test:coverage  # With coverage
bun run typecheck      # TypeScript check only
```

### Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

```
feat: add discriminator support
fix: handle empty paths array gracefully
BREAKING CHANGE: rename --output flag to --out
```

### Test fixtures

| Fixture | Purpose |
|---|---|
| `petstore.json` | Full real-world spec (~20 endpoints) |
| `minimal.yml` | Single `GET /health` — baseline |
| `schemas.yml` | Edge cases: allOf, oneOf, anyOf, discriminator, enums, nullable, circular refs |
| `params.yml` | Path params, query params, request body, 204 responses |
| `complex.yml` | Nested objects, deep nesting, format annotations |
| `errors.yml` | Invalid YAML for error handling tests |

## Contributing

1. Fork the repo and create a feature branch from `main`
2. Follow the [Conventional Commits](https://www.conventionalcommits.org/) format
3. Ensure `bun run test` and `bun run typecheck` pass
4. Open a pull request against `main`

## License

MIT
