export function createCache({ ttlMs = 30000, maxEntries = 200, now = Date.now } = {}) {
  const entries = new Map();
  let generation = 0;
  return {
    clear() { generation++; entries.clear(); },
    async get(key, load) {
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now()) return structuredClone(cached.value);
      entries.delete(key);
      const started = generation;
      const value = await load();
      // A write may commit while this loader is awaiting the database.
      if (generation === started) {
        if (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
        entries.set(key, { value: structuredClone(value), expiresAt: now() + ttlMs });
      }
      return value;
    }
  };
}
export const cache = createCache();
