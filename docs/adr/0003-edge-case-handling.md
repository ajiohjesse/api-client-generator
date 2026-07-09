# ADR-0003: Edge Case Handling Policy for Initial Release

Handle a defined set of edge cases before v0.1.0, deferring less common scenarios to follow-up releases.

**Status**: accepted

**Reasoning**: An npm package used via `npx` must fail gracefully — raw stack traces and silent failures erode trust. The selected edge cases were chosen because they represent the most common pitfalls a first-time user would hit.

**Handled before v0.1.0**:
- **`servers[0]` as default `baseUrl`** — extract the first server URL from the spec and inject it as the generated client's default base URL; users can still override
- **Graceful error on invalid output path** — wrap mkdir/write errors in a friendly CLI message
- **Clear error for OpenAPI 2.0 (a.k.a. Swagger)** — detect `swagger: "2.0"` and show a conversion hint
- **Discriminated unions from `oneOf` + `discriminator`** — generate proper tagged union types instead of raw `|` unions

**Deferred**:
- Webhooks and Callbacks
- Security schemes generation
- Content-Types other than `application/json`
- Path-level `$ref` expansion
- Very long operationId truncation
