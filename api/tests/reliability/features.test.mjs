import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createTestApp, validEvent } from '../helpers/testApp.mjs';
import { MailJob, Registration } from '../../src/db/models.mjs';
import { createMailWorker } from '../../src/services/mailWorker.mjs';

describe('registration durability and GET cache consistency', () => {
  let app;
  const participant = { name: 'Ada', email: 'ada@example.com' };
  const create = async (overrides) => (await request(app).post('/api/events').send(validEvent(overrides))).body;
  const register = (id, body = participant) => request(app).post('/api/events/' + id + '/registrations').send(body);
  const get = (url) => request(app).get('/api' + url);
  beforeEach(async () => { ({ app } = await createTestApp()); });

  it('keeps registrations when mail is offline and a new worker retries the durable job', async () => {
    const event = await create();
    assert.equal((await register(event.id)).status, 201);
    let time = Date.now() + 100;
    const broken = createMailWorker({ now: () => time, send: async () => { throw new Error('offline'); } });
    await broken.tick();
    const pending = await MailJob.findOne();
    assert.equal(await Registration.count(), 1);
    assert.equal(pending.attempts, 1);
    time = pending.nextAttemptAt.getTime() - 1;
    let delivered = 0;
    const recovered = createMailWorker({ now: () => time, send: async (job) => {
      delivered++;
      assert.equal(job.recipient, participant.email);
      assert.match(job.text, /Backend Bootcamp/);
    } });
    await recovered.tick();
    assert.equal(delivered, 0);
    time++;
    await recovered.tick();
    assert.equal(delivered, 1);
    assert.equal(await MailJob.count(), 0);
    assert.equal(await Registration.count(), 1);
  });

  it('rolls back the registration if its outbox job cannot be saved', async () => {
    const event = await create();
    MailJob.addHook('beforeCreate', 'fail-test', () => { throw new Error('disk write failed'); });
    try { assert.equal((await register(event.id)).status, 500); }
    finally { MailJob.removeHook('beforeCreate', 'fail-test'); }
    assert.equal(await Registration.count(), 0);
    assert.equal(await MailJob.count(), 0);
  });

  it('allows only one concurrent request to take the last seat', async () => {
    const event = await create({ capacity: 1 });
    const results = await Promise.all([register(event.id), register(event.id, { name: 'Grace', email: 'grace@example.com' })]);
    assert.deepEqual(results.map((res) => res.status).sort(), [201, 409]);
    assert.equal(await Registration.count(), 1);
    assert.equal(await MailJob.count(), 1);
  });

  it('rejects concurrent duplicate registrations and creates only one mail job', async () => {
    const event = await create();
    const results = await Promise.all([register(event.id), register(event.id)]);
    assert.deepEqual(results.map((res) => res.status).sort(), [201, 409]);
    assert.equal(await MailJob.count(), 1);
  });

  it('invalidates warmed list, detail, registrations and stats after every successful mutation', async () => {
    assert.deepEqual((await get('/events')).body, []);
    const event = await create({ capacity: 2 });
    assert.equal((await get('/events')).body.length, 1);
    assert.equal((await get('/events/' + event.id)).body.spotsLeft, 2);
    assert.deepEqual((await get('/events/' + event.id + '/registrations')).body, []);
    assert.equal((await get('/stats')).body[0].registered, 0);
    await register(event.id);
    assert.equal((await get('/events/' + event.id)).body.spotsLeft, 1);
    assert.equal((await get('/events/' + event.id + '/registrations')).body.length, 1);
    assert.equal((await get('/stats')).body[0].registered, 1);
    await request(app).patch('/api/events/' + event.id).send({ title: 'Updated event', capacity: 1 });
    assert.equal((await get('/events')).body[0].title, 'Updated event');
    assert.equal((await get('/events/' + event.id)).body.spotsLeft, 0);
    assert.equal((await get('/stats')).body[0].status, 'full');
    await request(app).delete('/api/events/' + event.id);
    assert.deepEqual((await get('/events')).body, []);
    assert.deepEqual((await get('/stats')).body, []);
    assert.equal((await get('/events/' + event.id)).status, 404);
    assert.equal((await get('/events/' + event.id + '/registrations')).status, 404);
    assert.equal(await Registration.count(), 0);
  });

  it('recomputes time-dependent stats even when its database snapshot is cached', async (t) => {
    const start = Date.now();
    const event = await create({ startsAt: new Date(start + 10000).toISOString() });
    assert.equal((await get('/stats')).body[0].status, 'open');
    t.mock.timers.enable({ apis: ['Date'], now: start + 11000 });
    assert.equal((await get('/stats')).body[0].status, 'past');
    assert.ok(event.id);
  });

  it('does not allow browsers or intermediaries to retain API responses', async () => {
    assert.equal((await get('/events')).headers['cache-control'], 'no-store');
    assert.equal((await get('/health')).headers['cache-control'], 'no-store');
  });
});
