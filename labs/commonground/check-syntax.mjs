import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// `node --check file.ts` does not reliably strip types, even under Node 24.
// Parse the stripped ES module without executing it or resolving its imports.
for (const path of ['hrea-cycle.ts', 'hrea-transfer-repro.ts', '../../weave.dev.config.commonground.ts']) {
  const file = fileURLToPath(new URL(path, import.meta.url));
  const source = stripTypeScriptTypes(readFileSync(file, 'utf8'), { mode: 'strip' });
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: source, encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`${path}: ${result.stderr}`);
    process.exitCode = result.status ?? 1;
  } else {
    console.log(`PASS syntax: ${path}`);
  }
}
