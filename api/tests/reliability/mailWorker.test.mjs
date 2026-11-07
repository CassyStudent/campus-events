import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createMailWorker } from '../../src/services/mailWorker.mjs';
import { createSender } from '../../src/mail/sender.mjs';

test('overlapping polls share one delivery run', async () => {
  let finish;
  let sends = 0;
  const jobs = { due: async () => [{ id: 1 }], delivered: async () => {} };
  const worker = createMailWorker({ jobs, send: () => {
    sends++;
    return new Promise((resolve) => { finish = resolve; });
  } });
  const first = worker.tick();
  const second = worker.tick();
  assert.equal(first, second);
  await Promise.resolve();
  finish();
  await first;
  assert.equal(sends, 1);
});

test('Nodemailer sends the confirmation through a real local SMTP connection', async (t) => {
  let message = '';
  const server = createServer((socket) => {
    let buffer = '';
    let dataMode = false;
    socket.write('220 localhost test SMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (dataMode && line !== '.') { message += line + '\n'; continue; }
        if (dataMode) { dataMode = false; socket.write('250 queued\r\n'); continue; }
        if (line.startsWith('DATA')) { dataMode = true; socket.write('354 send message\r\n'); }
        else if (line.startsWith('QUIT')) socket.end('221 bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const send = createSender({ smtpUrl: 'smtp://127.0.0.1:' + server.address().port, mailFrom: 'events@example.com' });
  await send({ id: 12, recipient: 'ada@example.com', subject: 'Registration confirmed', text: 'Your seat is reserved.' });
  assert.match(message, /To: ada@example.com/);
  assert.match(message, /Subject: Registration confirmed/);
  assert.match(message, /Your seat is reserved/);
});
