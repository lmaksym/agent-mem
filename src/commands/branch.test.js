import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");
const run = (args, cwd) =>
  execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });

describe("branch / switch / merge / branches", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "actx-test-branch-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("creates a branch with purpose", () => {
    const out = run('branch try-redis "evaluate Redis for caching"', dir);
    assert.ok(out.includes("BRANCHED: try-redis"));
    assert.ok(existsSync(join(dir, ".context/branches/try-redis/purpose.md")));
    assert.ok(existsSync(join(dir, ".context/branches/try-redis/commits.md")));
    assert.ok(existsSync(join(dir, ".context/branches/try-redis/trace.md")));
  });

  it("switches config to new branch", () => {
    const config = readFileSync(join(dir, ".context/config.yaml"), "utf-8");
    assert.ok(config.includes("branch: try-redis"));
  });

  it("lists branches", () => {
    const out = run("branches", dir);
    assert.ok(out.includes("try-redis"));
    assert.ok(out.includes("evaluate Redis"));
  });

  it("switches back to main", () => {
    const out = run("switch main", dir);
    assert.ok(out.includes("SWITCHED"));
    assert.ok(out.includes("main"));
  });

  it("refuses duplicate branch", () => {
    assert.throws(() => run("branch try-redis", dir));
  });

  it("merges branch back", () => {
    const out = run('merge try-redis "Redis too complex, using in-memory cache"', dir);
    assert.ok(out.includes("MERGED: try-redis"));
    assert.ok(existsSync(join(dir, ".context/memory/decisions.md")));
    const decisions = readFileSync(join(dir, ".context/memory/decisions.md"), "utf-8");
    assert.ok(decisions.includes("Redis too complex"));
  });

  it("switches to main after merge", () => {
    const config = readFileSync(join(dir, ".context/config.yaml"), "utf-8");
    assert.ok(config.includes("branch: main"));
  });
});

describe("pin / unpin", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "actx-test-pin-"));
    writeFileSync(join(dir, "package.json"), "{}");
    run("init", dir);
    run('remember --decision "test decision"', dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("pins a memory file to system/", () => {
    const out = run("pin memory/decisions.md", dir);
    assert.ok(out.includes("PINNED"));
    assert.ok(existsSync(join(dir, ".context/system/decisions.md")));
    assert.ok(!existsSync(join(dir, ".context/memory/decisions.md")));
  });

  it("unpins a system file to memory/", () => {
    const out = run("unpin system/decisions.md", dir);
    assert.ok(out.includes("UNPINNED"));
    assert.ok(existsSync(join(dir, ".context/memory/decisions.md")));
    assert.ok(!existsSync(join(dir, ".context/system/decisions.md")));
  });
});
