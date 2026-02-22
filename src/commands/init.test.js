import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");
const run = (args, cwd) =>
  execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });

describe("init", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-init-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({
      name: "test-proj",
      dependencies: { next: "15", react: "19", typescript: "5" },
    }));
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("creates .context/ directory", () => {
    const out = run("init", dir);
    assert.ok(existsSync(join(dir, ".context")));
    assert.ok(out.includes("INITIALIZED"));
  });

  it("detects stack from package.json", () => {
    const project = readFileSync(join(dir, ".context/system/project.md"), "utf-8");
    assert.ok(project.includes("Next.js"));
    assert.ok(project.includes("React"));
    assert.ok(project.includes("TypeScript"));
  });

  it("creates required files", () => {
    assert.ok(existsSync(join(dir, ".context/main.md")));
    assert.ok(existsSync(join(dir, ".context/config.yaml")));
    assert.ok(existsSync(join(dir, ".context/system/project.md")));
    assert.ok(existsSync(join(dir, ".context/system/conventions.md")));
  });

  it("initializes git repo", () => {
    assert.ok(existsSync(join(dir, ".context/.git")));
  });

  it("refuses reinit without --force", () => {
    const out = run("init", dir);
    assert.ok(out.includes("already exists"));
  });

  it("reinitializes with --force", () => {
    const out = run("init --force", dir);
    assert.ok(out.includes("INITIALIZED"));
  });
});

describe("init --from-claude", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-claude-"));
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "CLAUDE.md"), "# Project Rules\n\nAlways use TypeScript.\n");
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("imports CLAUDE.md", () => {
    const out = run("init --from-claude", dir);
    assert.ok(out.includes("Imported CLAUDE.md"));
    const imported = readFileSync(join(dir, ".context/memory/imported-claude-md.md"), "utf-8");
    assert.ok(imported.includes("Always use TypeScript"));
  });
});
