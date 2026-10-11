import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));

function sandbox(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'commonground-runner-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const moss = resolve(root, 'moss');
  const lab = resolve(moss, 'labs/commonground');
  const hrea = resolve(root, 'hrea-commonground-lab');
  mkdirSync(lab, { recursive: true });
  for (const name of ['run.mjs', 'cycle.json', 'hrea-cycle.ts']) copyFileSync(resolve(source, name), resolve(lab, name));
  writeFileSync(resolve(moss, 'package.json'), JSON.stringify({ version: 'test' }));
  writeFileSync(resolve(moss, 'moss.config.json'), JSON.stringify({ holochain: 'test' }));
  const run = action => spawnSync(process.execPath, [resolve(lab, 'run.mjs'), action], { encoding: 'utf8' });
  const git = args => {
    const result = spawnSync('git', args, { cwd: hrea, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  return { root, moss, lab, hrea, run, git };
}

test('inspect and unsupported actions never create or alter a hREA checkout', t => {
  const s = sandbox(t);
  assert.equal(s.run('inspect').status, 0);
  assert.equal(s.run('not-an-action').status, 1);
  assert.equal(existsSync(s.hrea), false);
});

test('prepare refuses an existing unrelated directory and preserves its content', t => {
  const s = sandbox(t);
  mkdirSync(s.hrea);
  const sentinel = resolve(s.hrea, 'existing-work.txt');
  writeFileSync(sentinel, 'keep this');
  const result = s.run('prepare-hrea');
  assert.equal(result.status, 1);
  assert.equal(readFileSync(sentinel, 'utf8'), 'keep this');
  assert.equal(existsSync(resolve(s.hrea, '.git')), false);
});

test('prepare rejects another commit without resetting it or erasing dirty work', t => {
  const s = sandbox(t);
  mkdirSync(s.hrea);
  s.git(['init', '-q']);
  const sentinel = resolve(s.hrea, 'existing-work.txt');
  writeFileSync(sentinel, 'original');
  s.git(['add', '.']);
  s.git(['-c', 'user.name=Lab Test', '-c', 'user.email=lab-test@example.invalid', 'commit', '-qm', 'test fixture']);
  const head = s.git(['rev-parse', 'HEAD']);
  writeFileSync(sentinel, 'uncommitted work');
  const result = s.run('prepare-hrea');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no checkout or reset was attempted/);
  assert.equal(s.git(['rev-parse', 'HEAD']), head);
  assert.equal(readFileSync(sentinel, 'utf8'), 'uncommitted work');
});

test('prepare at a pinned commit is repeatable and refuses a changed cycle file', t => {
  const s = sandbox(t);
  mkdirSync(resolve(s.hrea, 'clients/acceptance/src'), { recursive: true });
  s.git(['init', '-q']);
  writeFileSync(resolve(s.hrea, 'README.md'), 'fixture');
  s.git(['add', '.']);
  s.git(['-c', 'user.name=Lab Test', '-c', 'user.email=lab-test@example.invalid', 'commit', '-qm', 'test fixture']);
  const fixture = JSON.parse(readFileSync(resolve(s.lab, 'cycle.json'), 'utf8'));
  fixture.hreaCommit = s.git(['rev-parse', 'HEAD']);
  writeFileSync(resolve(s.lab, 'cycle.json'), JSON.stringify(fixture));
  assert.equal(s.run('prepare-hrea').status, 0);
  assert.equal(s.run('prepare-hrea').status, 0);
  const destination = resolve(s.hrea, 'clients/acceptance/src/commonground-cycle.ts');
  assert.equal(readFileSync(destination, 'utf8'), readFileSync(resolve(s.lab, 'hrea-cycle.ts'), 'utf8'));
  writeFileSync(destination, 'local changes');
  const result = s.run('prepare-hrea');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to overwrite/);
  assert.equal(readFileSync(destination, 'utf8'), 'local changes');
});
