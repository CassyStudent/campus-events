import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
test('a pending confirmation survives an actual Node process restart', async (t) => {
  const folder = await mkdtemp(path.join(tmpdir(), 'campus-events-test-'));
  const storage = path.join(folder, 'events.sqlite');
  t.after(async () => { await unlink(storage); await rmdir(folder); });
  const options = {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { NODE_ENV: 'test', DB_STORAGE: storage },
    timeout: 10000
  };
  await run(process.execPath, ['--input-type=module', '-e', `
    import { sequelize } from './src/db/models.mjs';
    import { events } from './src/services/events.mjs';
    await sequelize.sync();
    const event = await events.create({ title: 'Restart test', location: 'Campus', startsAt: new Date(), capacity: 2 });
    await events.register(event.id, { name: 'Ada', email: 'ada@example.com' });
    await sequelize.close();
  `], options);
  const second = await run(process.execPath, ['--input-type=module', '-e', `
    import { sequelize, Registration, MailJob } from './src/db/models.mjs';
    import { createMailWorker } from './src/services/mailWorker.mjs';
    let deliveries = 0;
    await createMailWorker({ send: async () => { deliveries++; } }).tick();
    console.log(JSON.stringify({ registrations: await Registration.count(), pending: await MailJob.count(), deliveries }));
    await sequelize.close();
  `], options);
  assert.deepEqual(JSON.parse(second.stdout.trim()), { registrations: 1, pending: 0, deliveries: 1 });
});
