import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");
const run = (args, cwd) =>
  execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });

describe("snapshot", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-snap-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "snap-test", dependencies: { express: "4" } }));
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("shows context snapshot", () => {
    const out = run("snapshot", dir);
    assert.ok(out.includes("CONTEXT SNAPSHOT"));
    assert.ok(out.includes("PINNED"));
  });

  it("shows stack in pinned files", () => {
    const out = run("snapshot", dir);
    assert.ok(out.includes("Express"));
  });
});

describe("read / write", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-rw-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("reads existing files", () => {
    const out = run("read system/project.md", dir);
    assert.ok(out.includes("rw-")); // part of temp dir name in project name
  });

  it("writes new files", () => {
    run('write memory/test.md --content "hello world"', dir);
    const content = readFileSync(join(dir, ".context/memory/test.md"), "utf-8");
    assert.equal(content, "hello world");
  });

  it("fails on nonexistent file", () => {
    assert.throws(() => run("read nonexistent.md", dir));
  });
});

describe("commit", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-commit-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("reports nothing to commit when clean", () => {
    const out = run("commit", dir);
    assert.ok(out.includes("No changes"));
  });

  it("commits after changes", () => {
    run('write memory/test.md --content "test data"', dir);
    const out = run("commit test checkpoint", dir);
    assert.ok(out.includes("COMMITTED"));
    assert.ok(out.includes("test checkpoint"));
  });
});

describe("status", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-status-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("shows status", () => {
    const out = run("status", dir);
    assert.ok(out.includes("STATUS"));
    assert.ok(out.includes("Commits: 1"));
    assert.ok(out.includes("pinned"));
  });
});

describe("remember", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-rem-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("remembers decisions", () => {
    run('remember --decision "chose X over Y"', dir);
    const content = readFileSync(join(dir, ".context/memory/decisions.md"), "utf-8");
    assert.ok(content.includes("chose X over Y"));
  });

  it("remembers patterns", () => {
    run('remember --pattern "always check logs"', dir);
    const content = readFileSync(join(dir, ".context/memory/patterns.md"), "utf-8");
    assert.ok(content.includes("always check logs"));
  });

  it("remembers mistakes", () => {
    run('remember --mistake "never force push"', dir);
    const content = readFileSync(join(dir, ".context/memory/mistakes.md"), "utf-8");
    assert.ok(content.includes("never force push"));
  });

  it("defaults to notes", () => {
    run("remember just a note", dir);
    const content = readFileSync(join(dir, ".context/memory/notes.md"), "utf-8");
    assert.ok(content.includes("just a note"));
  });
});

describe("search", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-search-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
    run('remember --decision "chose PostgreSQL for persistence"', dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("finds matching text", () => {
    const out = run("search PostgreSQL", dir);
    assert.ok(out.includes("PostgreSQL"));
    assert.ok(out.includes("decisions.md"));
  });

  it("reports no results for missing query", () => {
    const out = run("search zzzznonexistent", dir);
    assert.ok(out.includes("No results"));
  });
});
