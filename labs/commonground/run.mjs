import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const lab = dirname(fileURLToPath(import.meta.url));
const moss = resolve(lab, '../..');
const hrea = resolve(moss, '../hrea-commonground-lab');
const fixture = JSON.parse(readFileSync(resolve(lab, 'cycle.json'), 'utf8'));
const action = process.argv[2] ?? 'inspect';

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with ${result.status ?? result.signal}`);
}

function requirePinnedHrea() {
  if (!existsSync(resolve(hrea, '.git'))) throw new Error('Run prepare-hrea first.');
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: hrea, encoding: 'utf8' });
  if (result.status !== 0 || result.stdout.trim() !== fixture.hreaCommit) {
    throw new Error(`Expected hREA ${fixture.hreaCommit}; no checkout or reset was attempted.`);
  }
}

function copyCycle() {
  requirePinnedHrea();
  const destination = resolve(hrea, 'clients/acceptance/src/commonground-cycle.ts');
  const source = readFileSync(resolve(lab, 'hrea-cycle.ts'), 'utf8');
  if (existsSync(destination) && readFileSync(destination, 'utf8') !== source) {
    throw new Error(`Refusing to overwrite a different ${destination}. Review it first.`);
  }
  writeFileSync(destination, source);
}

try {
  switch (action) {
    case 'inspect': {
      const config = JSON.parse(readFileSync(resolve(moss, 'moss.config.json'), 'utf8'));
      const pkg = JSON.parse(readFileSync(resolve(moss, 'package.json'), 'utf8'));
      console.log(JSON.stringify({
        moss: { version: pkg.version, holochain: config.holochain },
        hrea: { tag: fixture.hreaTag, commit: fixture.hreaCommit, holochain: '0.7.x', directory: hrea },
        mode: 'Separate conductors; cross-tool links and Unyt checks are manual.',
      }, null, 2));
      break;
    }
    case 'prepare-hrea':
      if (!existsSync(hrea)) {
        run('git', ['clone', '--depth', '1', '--branch', fixture.hreaTag,
          'https://github.com/h-REA/hREA.git', hrea], moss);
      }
      copyCycle();
      console.log(`Prepared ${hrea}. Next: node labs/commonground/run.mjs build-hrea`);
      break;
    case 'build-hrea':
      requirePinnedHrea();
      run('nix', ['develop', '--command', 'bash', '-e', '-c', 'yarn install && yarn build'], hrea);
      break;
    case 'test-hrea':
      copyCycle();
      run('nix', ['develop', '--command', 'bash', '-e', '-c',
        'yarn workspace hrea-acceptance run fresh && yarn workspace hrea-acceptance run tsx src/commonground-cycle.ts'], hrea);
      break;
    case 'demo-hrea':
      requirePinnedHrea();
      run('nix', ['develop', '--command', 'yarn', 'demo:acceptance'], hrea);
      break;
    case 'ui-hrea':
      requirePinnedHrea();
      console.log('Separate hREA demo UI: http://localhost:8888; upstream yarn dev recreates only this clone\'s sandbox.');
      run('nix', ['develop', '--command', 'yarn', 'dev'], hrea);
      break;
    default:
      throw new Error('Use inspect, prepare-hrea, build-hrea, test-hrea, demo-hrea or ui-hrea.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
