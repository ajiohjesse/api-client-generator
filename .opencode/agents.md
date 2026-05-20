# agents

## Build
```bash
bun run build
```

## Test
```bash
bun run test
bun run test:watch
bun run test:coverage
```

## Type-check
```bash
bun run typecheck
```

## Generate client from spec
```bash
# From file
bun ./dist/cli.js generate -i ./spec.yaml -o ./src/api

# From URL
bun ./dist/cli.js generate -i https://example.com/openapi.json -o ./src/api

# With custom class name
bun ./dist/cli.js generate -i ./spec.yaml -o ./src/api --name MyClient
```

## Install CLI globally
```bash
bun run build && bun link
```
