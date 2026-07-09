# ADR-0001: npm CLI Package

Package the API Client Generator as an npm package with both a `bin` entry (`api-client-generator`) for `npx` use and a library export for programmatic use. The bin name matches the package name so `npx api-client-generator` works without aliasing.

**Status**: accepted

**Considered Options**:
- Separate bin name (`api-client-gen`) — requires users to remember a different command name
- Single entry point with no library export — unsuitable for programmatic/CI use

**Consequences**:
- The `bin` key in `package.json` maps `api-client-generator` → `./dist/cli.js`
- `tsup` produces two entry bundles: `cli` and `index` (library entry)
- `exports` field exposes `.` for library imports
- The `files` field scopes publish to `dist/` only
