import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
async function configuration(settings) {
  const result = await run(process.execPath, ['--input-type=module', '-e',
    "import { env } from './src/config/env.mjs'; console.log(JSON.stringify({ host: env.host, port: env.port }));"], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { NODE_ENV: 'test', ...settings }
  });
  return JSON.parse(result.stdout);
}

test('hosting keeps the local address and port defaults', async () => {
  assert.deepEqual(await configuration({}), { host: '0.0.0.0', port: 3000 });
});

test('hosting uses the platform IP and PORT, including IPv6', async () => {
  assert.deepEqual(await configuration({ IP: '::1', HOST: '127.0.0.1', PORT: '8100' }), { host: '::1', port: 8100 });
});

test('hosting accepts HOST when the platform does not provide IP', async () => {
  assert.deepEqual(await configuration({ HOST: '127.0.0.1' }), { host: '127.0.0.1', port: 3000 });
});
