import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const CLI = join(import.meta.dirname, '../../bin/agent-context.js');

function run(args, cwd) {
  return execSync(`node ${CLI} ${args}`, { cwd, encoding: 'utf-8', timeout: 10000 });
}

describe('diff', () => {
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'amem-diff-'));
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.name "test"', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'ignore' });
    run('init', dir);
    run('branch test-feature "testing diff"', dir);
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('fresh branch with no context changes shows no differences', () => {
    const out = run('diff test-feature', dir);
    assert.match(out, /DIFF.*main.*test-feature/);
    assert.match(out, /No differences found/);
    // Branch metadata should NOT appear
    assert.ok(!out.includes('purpose.md'), 'should not show branch metadata');
    assert.ok(!out.includes('commits.md'), 'should not show branch metadata');
    // Main files should NOT appear as deleted
    assert.ok(!out.includes('main.md'), 'should not show main files as deleted');
    assert.ok(!out.includes('system/'), 'should not show system files as deleted');
  });

  it('shows added files in branch', () => {
    const branchDir = join(dir, '.context', 'branches', 'test-feature');
    mkdirSync(join(branchDir, 'memory'), { recursive: true });
    writeFileSync(join(branchDir, 'memory', 'experiment.md'), '# Experiment\n- new finding\n');

    const out = run('diff test-feature', dir);
    assert.match(out, /experiment\.md/);
    assert.match(out, /\+.*experiment/);
  });

  it('shows verbose line details', () => {
    const out = run('diff test-feature --verbose', dir);
    assert.match(out, /DIFF/);
  });

  it('errors on nonexistent branch', () => {
    assert.throws(() => run('diff nonexistent', dir), /not found/);
  });

  it('errors with no branch argument', () => {
    assert.throws(() => run('diff', dir), /Usage/);
  });
});
