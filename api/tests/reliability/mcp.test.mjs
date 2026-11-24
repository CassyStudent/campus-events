import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createTestApp, validEvent } from '../helpers/testApp.mjs';
import { MailJob, Registration } from '../../src/db/models.mjs';
import { subscribeNotifications } from '../../src/services/notifications.mjs';

describe('MCP Streamable HTTP', () => {
  let app;
  const people = [{ name: 'Ada', email: 'ada@example.com' }, { name: 'Grace', email: 'grace@example.com' }];
  const rpc = (method, params = {}) => request(app).post('/mcp').set('Accept', 'application/json, text/event-stream').send({ jsonrpc: '2.0', id: 1, method, params });
  const call = async (name, args) => (await rpc('tools/call', { name, arguments: args })).body;
  const create = async (overrides) => (await request(app).post('/api/events').send(validEvent(overrides))).body;
  beforeEach(async () => { ({ app } = await createTestApp()); });

  it('initializes, lists usable schemas and supports ping and notifications', async () => {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18' });
    assert.equal(init.body.result.protocolVersion, '2025-06-18');
    assert.deepEqual(init.body.result.capabilities, { tools: {} });
    const tools = (await rpc('tools/list')).body.result.tools;
    assert.deepEqual(tools.map((tool) => tool.name), ['list_events', 'register_for_event']);
    assert.equal(tools[1].inputSchema.properties.people.type, 'array');
    assert.deepEqual((await rpc('ping')).body.result, {});
    assert.equal((await request(app).post('/mcp').set('Accept', 'application/json, text/event-stream').send({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);
    assert.equal((await request(app).get('/mcp')).status, 405);
  });

  it('filters upcoming and past events at call time even with a warmed cache', async (t) => {
    const now = Date.now();
    const past = await create({ startsAt: new Date(now - 1000).toISOString() });
    const future = await create({ startsAt: new Date(now + 1000).toISOString() });
    const list = async (period) => JSON.parse((await call('list_events', { period })).result.content[0].text);
    assert.deepEqual((await list('upcoming')).map((event) => event.id), [future.id]);
    assert.deepEqual((await list('past')).map((event) => event.id), [past.id]);
    t.mock.timers.enable({ apis: ['Date'], now: now + 2000 });
    assert.deepEqual(await list('upcoming'), []);
    assert.equal((await list('past')).length, 2);
  });

  it('registers a group atomically, invalidates cache and emits one private-safe notification per person', async () => {
    const event = await create({ capacity: 2 });
    await request(app).get('/api/events/' + event.id);
    const messages = [];
    const stop = subscribeNotifications((message) => messages.push(message));
    try {
      const reply = await call('register_for_event', { eventId: event.id, people });
      assert.equal(JSON.parse(reply.result.content[0].text).length, 2);
      assert.equal(await Registration.count(), 2);
      assert.equal(await MailJob.count(), 2);
      assert.equal((await request(app).get('/api/events/' + event.id)).body.spotsLeft, 0);
      assert.equal(messages.length, 2);
      assert.equal(new Set(messages.map((message) => message.id)).size, 2);
      for (const message of messages) {
        assert.deepEqual(Object.keys(message).sort(), ['eventId', 'id', 'type']);
        assert.equal(message.type, 'registration.created');
      }
      const duplicate = await call('register_for_event', { eventId: event.id, people: [people[0]] });
      assert.equal(duplicate.result.isError, true);
      assert.equal(messages.length, 2);
    } finally { stop(); }
  });

  it('rolls back an entire group when capacity or duplicate checks fail, emitting no toast', async () => {
    const event = await create({ capacity: 1 });
    const messages = [];
    const stop = subscribeNotifications((message) => messages.push(message));
    try {
      assert.equal((await call('register_for_event', { eventId: event.id, people })).result.isError, true);
      assert.equal(await Registration.count(), 0);
      assert.equal(await MailJob.count(), 0);
      assert.deepEqual(messages, []);
      await request(app).patch('/api/events/' + event.id).send({ capacity: 3 });
      assert.equal((await call('register_for_event', { eventId: event.id, people: [people[0], people[0]] })).result.isError, true);
      assert.equal(await Registration.count(), 0);
    } finally { stop(); }
  });

  it('validates tool inputs, origins, protocol versions and JSON-RPC envelopes', async () => {
    assert.equal((await call('list_events', { period: 'yesterday' })).result.isError, true);
    assert.equal((await call('register_for_event', { eventId: 1, people: [{ name: 'Ada', email: 'wrong' }] })).result.isError, true);
    assert.equal((await call('unknown', {})).error.code, -32602);
    assert.equal((await rpc('unknown')).body.error.code, -32601);
    assert.equal((await request(app).post('/mcp').set('Origin', 'https://evil.example').send({})).status, 403);
    assert.equal((await rpc('ping').set('MCP-Protocol-Version', 'unsupported')).status, 400);
    assert.equal((await request(app).post('/mcp').set('Accept', 'application/json, text/event-stream').send({})).body.error.code, -32600);
    assert.equal((await request(app).post('/mcp').set('Content-Type', 'application/json').set('Accept', 'application/json, text/event-stream').send('{')).body.error.code, -32700);
    assert.equal((await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'ping' })).status, 406);
  });
});
