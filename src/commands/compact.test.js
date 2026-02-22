import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");

function run(args, cwd) {
  return execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", timeout: 10000 });
}

describe("compact", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "amem-compact-"));
    execSync("git init", { cwd: dir, stdio: "ignore" });
    execSync('git config user.name "test"', { cwd: dir, stdio: "ignore" });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "ignore" });

    // Init context
    run("init", dir);

    // Add some memory entries — mix of old and recent
    const ctxDir = join(dir, ".context");
    const memDir = join(ctxDir, "memory");

    const oldDate = "2025-01-01";
    const recentDate = new Date().toISOString().slice(0, 10);

    const decisionsContent = [
      "---",
      'description: "Decisions"',
      "---",
      "",
      "# Decisions",
      "",
      `- [${oldDate} 10:00] Use PostgreSQL for primary storage`,
      `- [${oldDate} 11:00] Choose FastAPI over Flask`,
      `- [${recentDate} 09:00] Switch to connection pooling`,
    ].join("\n");

    writeFileSync(join(memDir, "decisions.md"), decisionsContent);

    // Add a pinned file
    mkdirSync(join(ctxDir, "system"), { recursive: true });
    writeFileSync(join(ctxDir, "system", "task.md"), "# Current Task\nBuild compact command");

    // Commit so we have a clean state
    execSync("git add -A && git commit -m 'setup'", { cwd: dir, stdio: "ignore" });
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("dry-run shows what would be archived without changes", () => {
    const out = run("compact --dry-run", dir);
    assert.match(out, /COMPACT/);
    assert.match(out, /dry run/);
    assert.match(out, /system\/task\.md/);
    assert.match(out, /pinned/);
    // Should not create archive directory
    assert.ok(!existsSync(join(dir, ".context", "archive")));
  });

  it("default compact archives old entries, keeps recent + pins", () => {
    const out = run("compact", dir);
    assert.match(out, /COMPACT/);
    assert.match(out, /KEPT/);
    assert.match(out, /ARCHIVED/);
    assert.match(out, /system\/task\.md.*pinned/);

    // Archive should exist
    assert.ok(existsSync(join(dir, ".context", "archive")));

    // Decisions file should still have the recent entry
    const decisions = readFileSync(join(dir, ".context", "memory", "decisions.md"), "utf-8");
    assert.match(decisions, /connection pooling/);
    // Old entries should be gone from the file
    assert.ok(!decisions.includes("Use PostgreSQL"));
  });

  it("--hard keeps only pins, archives everything else", () => {
    // Re-add some entries
    const ctxDir = join(dir, ".context");
    const recentDate = new Date().toISOString().slice(0, 10);
    const content = [
      "---",
      'description: "Patterns"',
      "---",
      "",
      "# Patterns",
      "",
      `- [${recentDate} 10:00] Always use typed responses`,
    ].join("\n");
    writeFileSync(join(ctxDir, "memory", "patterns.md"), content);
    execSync("git add -A && git commit -m 'add patterns'", { cwd: dir, stdio: "ignore" });

    const out = run("compact --hard", dir);
    assert.match(out, /--hard/);
    assert.match(out, /system\/task\.md.*pinned/);

    // Patterns file should be emptied (entries archived)
    const patterns = readFileSync(join(ctxDir, "memory", "patterns.md"), "utf-8");
    assert.ok(!patterns.includes("Always use typed responses"));
  });
});
