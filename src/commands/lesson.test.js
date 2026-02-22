import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");
const run = (args, cwd) =>
  execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });

describe("lesson", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-lesson-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("creates lesson with --problem and --resolution flags", () => {
    run('lesson "API backoff" --problem "Hit 429 rate limit" --resolution "Added exponential backoff"', dir);
    const content = readFileSync(join(dir, ".context/memory/lessons.md"), "utf-8");
    assert.ok(content.includes("API backoff"));
    assert.ok(content.includes("**Problem:** Hit 429 rate limit"));
    assert.ok(content.includes("**Resolution:** Added exponential backoff"));
  });

  it("creates lesson with -> shorthand", () => {
    run('lesson "Voice cut off -> Lower VAD threshold to 0.3"', dir);
    const content = readFileSync(join(dir, ".context/memory/lessons.md"), "utf-8");
    assert.ok(content.includes("**Problem:** Voice cut off"));
    assert.ok(content.includes("**Resolution:** Lower VAD threshold to 0.3"));
  });

  it("includes tags when provided", () => {
    run('lesson "Memory leak" --problem "OOM after 1hr" --resolution "Close DB connections" --tags "infra, database"', dir);
    const content = readFileSync(join(dir, ".context/memory/lessons.md"), "utf-8");
    assert.ok(content.includes("**Tags:** infra, database"));
  });

  it("appends multiple lessons to same file", () => {
    const content = readFileSync(join(dir, ".context/memory/lessons.md"), "utf-8");
    const headings = content.split("\n").filter((l) => l.startsWith("### ["));
    assert.ok(headings.length >= 3, `Expected at least 3 lessons, got ${headings.length}`);
  });

  it("has correct frontmatter and title", () => {
    const content = readFileSync(join(dir, ".context/memory/lessons.md"), "utf-8");
    assert.ok(content.includes("# Lessons Learned"));
    assert.ok(content.includes("description:"));
  });

  it("fails without problem/resolution or -> separator", () => {
    assert.throws(() => run('lesson "just some text"', dir));
  });

  it("fails with empty -> sides", () => {
    assert.throws(() => run('lesson "-> only resolution"', dir));
  });
});

describe("lesson on branch", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-test-lesson-branch-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
    run("branch test-branch exploring", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("saves lesson to branch-scoped path", () => {
    run('lesson "Branch fix -> Applied workaround"', dir);
    const content = readFileSync(join(dir, ".context/branches/test-branch/memory/lessons.md"), "utf-8");
    assert.ok(content.includes("Branch fix"));
    assert.ok(content.includes("**Problem:** Branch fix"));
    assert.ok(content.includes("**Resolution:** Applied workaround"));
  });
});
