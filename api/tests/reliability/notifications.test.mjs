import assert from 'node:assert/strict';
import { once } from 'node:events';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createTestApp, validEvent } from '../helpers/testApp.mjs';
import { MailJob } from '../../src/db/models.mjs';
import { publishNotification, subscribeNotifications } from '../../src/services/notifications.mjs';

describe('live notifications', () => {
  let app;
  beforeEach(async () => { ({ app } = await createTestApp()); });

  it('delivers creation and one anonymous notification per committed REST registration to two open streams', async () => {
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const abort = new AbortController();
    const streams = [];
    const connect = async () => {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/notifications', { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) });
      assert.match(response.headers.get('content-type'), /text\/event-stream/);
      assert.equal(response.headers.get('x-accel-buffering'), 'no');
      const reader = response.body.getReader();
      await reader.read(); // retry directive proves the stream is connected before the write.
      streams.push(reader);
      return async () => {
        let text = '';
        while (!text.includes('data: ')) text += new TextDecoder().decode((await reader.read()).value);
        return JSON.parse(text.split('data: ')[1].split('\n')[0]);
      };
    };
    try {
      const [first, second] = await Promise.all([connect(), connect()]);
      const event = (await request(app).post('/api/events').send(validEvent())).body;
      const created = await Promise.all([first(), second()]);
      assert.deepEqual(created[0], created[1]);
      assert.equal(created[0].type, 'event.created');
      await request(app).post('/api/events/' + event.id + '/registrations').send({ name: 'Private Name', email: 'private@example.com' }).expect(201);
      const registered = await Promise.all([first(), second()]);
      assert.deepEqual(registered[0], registered[1]);
      assert.deepEqual(Object.keys(registered[0]).sort(), ['eventId', 'id', 'type']);
      assert.equal(registered[0].type, 'registration.created');
      assert.doesNotMatch(JSON.stringify(registered), /Private|private@example/);
    } finally {
      abort.abort();
      for (const reader of streams) await reader.cancel().catch(() => {});
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('sends no notification when persistence fails or a registration is rejected', async () => {
    const event = (await request(app).post('/api/events').send(validEvent())).body;
    const messages = [];
    const stop = subscribeNotifications((message) => messages.push(message));
    MailJob.addHook('beforeCreate', 'fail-notification-test', () => { throw new Error('disk failed'); });
    try {
      await request(app).post('/api/events/' + event.id + '/registrations').send({ name: 'Ada', email: 'ada@example.com' }).expect(500);
      assert.deepEqual(messages, []);
    } finally { MailJob.removeHook('beforeCreate', 'fail-notification-test'); stop(); }
  });

  it('replays only messages missed after the last known ID and isolates disconnected clients', () => {
    const messages = [];
    const stop = subscribeNotifications((message) => messages.push(message));
    publishNotification('event.created', 1);
    stop();
    publishNotification('registration.created', 1);
    const replay = [];
    const end = subscribeNotifications((message) => replay.push(message), messages[0].id);
    end();
    assert.equal(replay.length, 1);
    assert.equal(replay[0].type, 'registration.created');
    const broken = subscribeNotifications(() => { throw new Error('socket closed'); });
    assert.doesNotThrow(() => publishNotification('event.created', 2));
    broken();
  });
});
