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
  const run = (action, options = [], env = {}) => spawnSync(process.execPath, [resolve(lab, 'run.mjs'), action, ...options], {
    encoding: 'utf8', env: { ...process.env, ...env },
  });
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

test('current environment rejects Moss runtime and propagates upstream failures', t => {
  const s = sandbox(t);
  mkdirSync(s.hrea);
  s.git(['init', '-q']);
  writeFileSync(resolve(s.hrea, 'README.md'), 'fixture');
  s.git(['add', '.']);
  s.git(['-c', 'user.name=Lab Test', '-c', 'user.email=lab-test@example.invalid', 'commit', '-qm', 'test fixture']);
  const fixture = JSON.parse(readFileSync(resolve(s.lab, 'cycle.json'), 'utf8'));
  fixture.hreaCommit = s.git(['rev-parse', 'HEAD']);
  writeFileSync(resolve(s.lab, 'cycle.json'), JSON.stringify(fixture));
  const bin = resolve(s.root, 'bin');
  mkdirSync(bin);
  const trace = resolve(s.root, 'commands.log');
  const script = (name, body) => writeFileSync(resolve(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  const env = { PATH: `${bin}:${process.env.PATH}`, LAB_RUN_TRACE: trace };
  script('holochain', 'echo "holochain 0.6.1"');
  script('hc', 'echo "Initialising log output formatting with option Log"; echo "holochain_cli 0.7.0"');
  script('yarn', 'printf "%s\\n" "$*" >> "$LAB_RUN_TRACE"; [ "$1" != build ] || exit 23');
  const rejected = s.run('build-hrea', ['--current-env'], env);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /requires holochain 0.7.x/);
  assert.equal(existsSync(trace), false);
  script('holochain', 'echo "holochain 0.7.0"');
  const failedBuild = s.run('build-hrea', ['--current-env'], env);
  assert.equal(failedBuild.status, 1);
  assert.match(failedBuild.stderr, /bash exited with 23/);
  assert.equal(readFileSync(trace, 'utf8'), 'install --frozen-lockfile\nbuild\n');
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
