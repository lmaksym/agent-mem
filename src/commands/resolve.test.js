import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const CLI = join(import.meta.dirname, "../../bin/agent-context.js");

function run(args, cwd) {
  return execSync(`node ${CLI} ${args}`, { cwd, encoding: "utf-8", timeout: 10000 });
}

function makeConflict(ours, theirs) {
  return `<<<<<<< HEAD\n${ours}\n=======\n${theirs}\n>>>>>>> branch-b`;
}

describe("resolve", () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "actx-resolve-"));
    execSync("git init", { cwd: dir, stdio: "ignore" });
    execSync('git config user.name "test"', { cwd: dir, stdio: "ignore" });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: "ignore" });
    run("init", dir);
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports no conflicts when clean", () => {
    const out = run("resolve", dir);
    assert.match(out, /No merge conflicts/);
  });

  it("resolves memory file conflicts by keeping both sides deduplicated", () => {
    const memFile = join(dir, ".context", "memory", "decisions.md");
    writeFileSync(memFile, [
      "# Decisions",
      "",
      "- [2026-01-01] Shared decision",
      makeConflict(
        "- [2026-02-01] Our local decision",
        "- [2026-02-01] Their remote decision"
      ),
    ].join("\n"));

    const out = run("resolve", dir);
    assert.match(out, /Resolved/);
    assert.match(out, /append-only/);

    const resolved = readFileSync(memFile, "utf-8");
    assert.ok(!resolved.includes("<<<<<<<"));
    assert.ok(!resolved.includes(">>>>>>>"));
    assert.match(resolved, /Our local decision/);
    assert.match(resolved, /Their remote decision/);
    assert.match(resolved, /Shared decision/);
  });

  it("deduplicates exact matches in append-only merge", () => {
    const memFile = join(dir, ".context", "memory", "patterns.md");
    mkdirSync(join(dir, ".context", "memory"), { recursive: true });
    writeFileSync(memFile, [
      "# Patterns",
      makeConflict(
        "- [2026-01-01] Same entry\n- [2026-01-02] Only ours",
        "- [2026-01-01] Same entry\n- [2026-01-03] Only theirs"
      ),
    ].join("\n"));

    run("resolve", dir);
    const resolved = readFileSync(memFile, "utf-8");

    // "Same entry" should appear exactly once
    const count = (resolved.match(/Same entry/g) || []).length;
    assert.equal(count, 1, "duplicate entry should appear only once");
    assert.match(resolved, /Only ours/);
    assert.match(resolved, /Only theirs/);
  });

  it("preserves whitespace differences (no trim-based dedupe)", () => {
    const memFile = join(dir, ".context", "memory", "ws-test.md");
    writeFileSync(memFile, makeConflict(
      "- [2026-01-01]   spaced entry",
      "- [2026-01-01] spaced entry"
    ));

    run("resolve", dir);
    const resolved = readFileSync(memFile, "utf-8");
    // Both should be kept — different exact strings
    const count = (resolved.match(/spaced entry/g) || []).length;
    assert.equal(count, 2, "whitespace-different lines should both be kept");
  });

  it("resolves config.yaml with prefer-ours strategy", () => {
    const configFile = join(dir, ".context", "config.yaml");
    writeFileSync(configFile, [
      "auto_commit: true",
      makeConflict(
        "branch: feature-a",
        "branch: feature-b"
      ),
      "system_files_max: 10",
    ].join("\n"));

    run("resolve", dir);
    const resolved = readFileSync(configFile, "utf-8");
    assert.ok(!resolved.includes("<<<<<<<"));
    assert.match(resolved, /feature-a/, "should keep ours");
    assert.ok(!resolved.includes("feature-b"), "should drop theirs");
    assert.match(resolved, /auto_commit: true/);
    assert.match(resolved, /system_files_max: 10/);
  });

  it("resolves other files with keep-both strategy", () => {
    const otherFile = join(dir, ".context", "main.md");
    writeFileSync(otherFile, [
      "# Project",
      makeConflict("## Our section", "## Their section"),
    ].join("\n"));

    run("resolve", dir);
    const resolved = readFileSync(otherFile, "utf-8");
    assert.ok(!resolved.includes("<<<<<<<"));
    assert.match(resolved, /Our section/);
    assert.match(resolved, /Their section/);
    assert.match(resolved, /merged/);
  });

  it("handles multiple conflict blocks in one file", () => {
    const memFile = join(dir, ".context", "memory", "multi.md");
    writeFileSync(memFile, [
      "# Multi",
      makeConflict("- block1-ours", "- block1-theirs"),
      "- shared middle line",
      makeConflict("- block2-ours", "- block2-theirs"),
    ].join("\n"));

    run("resolve", dir);
    const resolved = readFileSync(memFile, "utf-8");
    assert.ok(!resolved.includes("<<<<<<<"));
    assert.match(resolved, /block1-ours/);
    assert.match(resolved, /block1-theirs/);
    assert.match(resolved, /shared middle line/);
    assert.match(resolved, /block2-ours/);
    assert.match(resolved, /block2-theirs/);
  });

  it("dry-run shows strategy without modifying files", () => {
    const memFile = join(dir, ".context", "memory", "drytest.md");
    writeFileSync(memFile, makeConflict("ours", "theirs"));

    const out = run("resolve --dry-run", dir);
    assert.match(out, /dry run/);

    const content = readFileSync(memFile, "utf-8");
    assert.ok(content.includes("<<<<<<<"), "should not modify file in dry-run");
  });
});
