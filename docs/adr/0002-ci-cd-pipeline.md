# ADR-0002: CI/CD Pipeline

Two GitHub Actions workflows: CI on every push, and semantic-release on merge to main with npm provenance.

**Status**: accepted

**Considered Options**:
- Single workflow for everything — conflates CI checks with publishing, harder to debug
- Manual publish with `npm publish` — error-prone, no changelog generation
- Provenance-less publish — loses the npm "verified" badge and tamper-proofing

**Consequences**:
- `ci.yml` runs `install → typecheck → test` on push/PR to any branch
- `release.yml` runs on merge to `main`: `install → build → test → semantic-release`
- semantic-release publishes to npm with `--provenance` (requires OIDC `id-token: write`)
- Commit messages must follow Conventional Commits (`feat:`, `fix:`, `BREAKING CHANGE:`, etc.)
- `commitlint` pre-commit hook enforces conventional commit format
