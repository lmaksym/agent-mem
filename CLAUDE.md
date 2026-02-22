# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

agent-mem is a zero-dependency CLI tool (`amem`) that gives AI coding agents persistent, git-backed memory across sessions. It manages a `.context/` directory with structured markdown files, versioned via an internal git repo.

## Commands

```bash
npm test              # Run all tests (Node.js built-in test runner)
npm start             # Run CLI
node bin/agent-mem.js <command>  # Run specific command
```

Run a single test file:
```bash
node --test src/commands/branch.test.js
```

No linter is configured yet.

## Architecture

### CLI Entry Point

`bin/agent-mem.js` — Dynamic command dispatcher that lazy-loads commands via `import()`. All 30+ commands live in `src/commands/` and follow the signature:

```javascript
export default async function commandName({ args, flags }) { ... }
```

`flags._contextRoot` is injected by the CLI before dispatch.

### Core Modules (`src/core/`)

- **fs.js** — File I/O with YAML frontmatter parsing, tree building
- **git.js** — Git command wrapper using `child_process.execSync`
- **config.js** — Simple YAML parser for `.context/config.yaml`
- **context-root.js** — Walks up filesystem to find `.context/`
- **reflect-gather.js / reflect-parse.js / reflect-defrag.js** — Reflection pipeline (input collection → output parsing → memory health analysis)
- **auto-commit.js** — Auto-checkpoint logic
- **lock.js** — File-level locking

### .context/ Directory Layout

```
.context/
├── main.md              # Project roadmap/goals
├── config.yaml          # Settings
├── system/              # Pinned files — always loaded in snapshot (max 10)
├── memory/              # Learned context (decisions, patterns, mistakes, notes)
├── branches/<name>/     # Exploration branches with scoped memory
├── reflections/         # Structured synthesis outputs
└── archive/             # Compacted/forgotten files (never deleted)
```

### Key Patterns

- **ESM-only** — All files use `import`/`export`, requires Node.js 18+
- **Zero dependencies** — Uses only Node.js built-in modules
- **Frontmatter** — Markdown files support `---` delimited YAML metadata (description, limit, read_only)
- **Argument parsing** — Custom zero-dep parser in `bin/parse-args.js`; boolean-only flags (help, verbose, force, deep, dry-run) never consume the next argument
- **Error output** — Uses emoji prefixes (❌, ⚠️) and exits with status 1 on errors

### Testing

Tests use Node.js built-in `node:test` and `node:assert` modules. Each test file creates a temporary `.context/` directory, runs commands against it, and cleans up. Test files are colocated with commands: `src/commands/*.test.js`.

### IDE Integration

`src/commands/sync.js` exports `.context/` content to IDE rule files (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, GEMINI.md). The `.claude/` directory contains Claude Code commands and skills for this project.
