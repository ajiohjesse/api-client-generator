---
name: gen-client
description: Generate a typesafe fetch-based TypeScript API client from an OpenAPI 3.x spec. Use when the user wants to create a typed API client from an OpenAPI document, convert an OpenAPI spec to TypeScript code, generate typed fetch calls from an API description, or run @rehx/api-client-generator.
---

# gen-client

Uses [@rehx/api-client-generator](https://github.com/ajiohjesse/api-client-generator) to produce a zero-dependency, fully typesafe fetch-based TypeScript client from an OpenAPI 3.x specification.

## Workflow

1. **Accept the input** — an OpenAPI 3.0 or 3.1 spec as a file path (JSON/YAML) or URL. If the spec is Swagger/OpenAPI 2.0, tell the user it's not supported and suggest a conversion tool (e.g., `api-spec-converter`).

2. **Build the project** — if `dist/` is missing or stale, run `bun run build` first so the CLI is ready.

3. **Run the generator:**
   ```bash
   npx @rehx/api-client-generator generate -i <spec-path-or-url> -o <output-dir>
   ```
   Optionally pass `--name <ClassName>` to set a custom client class name instead of `ApiClient`.

4. **Verify the output** — confirm these three files exist in the output directory:
   - `types.ts` — schema types (interfaces, type aliases, unions)
   - `client.ts` — the client class with typed methods
   - `index.ts` — barrel export

5. **Point the user to the generated code** — show them how to instantiate the client:
   ```typescript
   import { ApiClient } from './<output-dir>';
   const client = new ApiClient({ baseUrl: 'https://api.example.com' });
   ```

## Rules

- Use `npx @rehx/api-client-generator` as the primary invocation (not `npx api-client-generator`).
- Flag OpenAPI 2.0 (Swagger) specs with a conversion hint — the tool only supports 3.0 and 3.1.
- Do not edit the generated files manually — they're deterministic from the spec.
- The generated client uses native `fetch` and has zero runtime dependencies.