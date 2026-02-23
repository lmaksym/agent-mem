# Contributing to agent-mem

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/lmaksym/agent-context.git
cd agent-context
npm install
npm test
```

No build step required — the project runs directly as ESM.

## Requirements

- **Node.js 20+** (ESM-only, no CommonJS)
- **Zero runtime dependencies** — PRs adding runtime deps will not be accepted. Dev dependencies (testing, formatting) are fine.

## Code Style

- Prettier handles formatting — run `npm run format` before committing
- Pre-commit hook runs automatically via husky + lint-staged
- `npm run format:check` verifies formatting without modifying files
- Follow existing patterns in the codebase (no additional lint rules yet)

## Testing

Tests use Node.js built-in `node:test` and `node:assert`. Test files are colocated with commands:

```
src/commands/foo.js
src/commands/foo.test.js
```

Run all tests:

```bash
npm test
```

Run a single test file:

```bash
node --test src/commands/branch.test.js
```

Each test creates a temporary `.context/` directory, runs commands, and cleans up. Follow this pattern for new tests.

## Making Changes

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add or update tests as needed
4. Run `npm run format` and `npm test`
5. Open a pull request

## Commit Messages

Use the format `type: description`:

- `feat:` — new feature
- `fix:` — bug fix
- `ref:` — refactoring (no behavior change)
- `doc:` — documentation only
- `chore:` — maintenance, CI, deps

Examples:

```
feat: add export command for JSON output
fix: prevent duplicate entries in lessons.md
ref: extract shared builder in sync.js
doc: update README with new commands
```

## Project Structure

- `bin/` — CLI entry point and argument parser
- `src/commands/` — one file per command, each exports a default async function
- `src/core/` — shared modules (fs, git, config, etc.)

Commands follow this signature:

```javascript
export default async function commandName({ args, flags }) { ... }
```

## Questions?

Open an issue or start a discussion. We're happy to help!
