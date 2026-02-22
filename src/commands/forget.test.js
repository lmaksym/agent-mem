import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");

function run(args, cwd) {
  return execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", timeout: 10000 });
}

describe("forget", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-forget-"));
    execSync("git init", { cwd: dir, stdio: "ignore" });
    execSync('git config user.name "test"', { cwd: dir, stdio: "ignore" });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "ignore" });
    run("init", dir);

    // Add a memory file to forget
    const memFile = join(dir, ".context", "memory", "old-notes.md");
    writeFileSync(memFile, "# Old Notes\n- outdated stuff\n");
    execSync("git -C .context add -A && git -C .context commit -m 'add notes'", { cwd: dir, stdio: "ignore" });
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("removes file and archives it", () => {
    const out = run("forget memory/old-notes.md", dir);
    assert.match(out, /FORGOT.*old-notes\.md/);
    assert.match(out, /Archived/);
    assert.ok(!existsSync(join(dir, ".context", "memory", "old-notes.md")));
    assert.ok(existsSync(join(dir, ".context", "archive")));
  });

  it("refuses to forget pinned (system/) files", () => {
    assert.throws(() => run("forget system/project.md", dir), /Cannot forget pinned/);
  });

  it("refuses ./system/ bypass", () => {
    assert.throws(() => run("forget ./system/project.md", dir), /Cannot forget pinned/);
  });

  it("refuses to forget config.yaml", () => {
    assert.throws(() => run("forget config.yaml", dir), /Cannot forget config/);
  });

  it("refuses ./config.yaml bypass", () => {
    assert.throws(() => run("forget ./config.yaml", dir), /Cannot forget config/);
  });

  it("rejects path traversal (../)", () => {
    assert.throws(() => run("forget ../outside.txt", dir), /Invalid path/);
  });

  it("errors on nonexistent file", () => {
    assert.throws(() => run("forget memory/nope.md", dir), /not found/);
  });
});
