import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCache } from '../../src/cache/cache.mjs';

test('cache hits avoid loaders; expiry reloads and callers cannot mutate cached values', async () => {
  let time = 0;
  let loads = 0;
  const cache = createCache({ ttlMs: 10, now: () => time });
  const load = async () => ({ count: ++loads });
  const first = await cache.get('a', load);
  first.count = 99;
  assert.deepEqual(await cache.get('a', load), { count: 1 });
  time = 10;
  assert.deepEqual(await cache.get('a', load), { count: 2 });
});

test('an in-flight read cannot repopulate the cache after invalidation', async () => {
  const cache = createCache();
  let finish;
  const old = cache.get('a', () => new Promise((resolve) => { finish = resolve; }));
  cache.clear();
  finish('old');
  await old;
  assert.equal(await cache.get('a', async () => 'new'), 'new');
});

test('cache is bounded and errors are never cached', async () => {
  const cache = createCache({ maxEntries: 1 });
  await assert.rejects(cache.get('a', async () => { throw new Error('offline'); }));
  assert.equal(await cache.get('a', async () => 'ok'), 'ok');
  await cache.get('b', async () => 'other');
  assert.equal(await cache.get('a', async () => 'reloaded'), 'reloaded');
});
