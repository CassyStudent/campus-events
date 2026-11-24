import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchNotifications } from '../src/api/events.js';

describe('notification subscription', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('keeps one source, ignores replays and malformed messages, and strips private fields', () => {
    let source;
    vi.stubGlobal('EventSource', class {
      constructor(url) { this.url = url; this.close = vi.fn(); source = this; }
    });
    const receive = vi.fn();
    const stop = watchNotifications(receive);
    expect(source.url).toBe('/api/notifications');
    const message = { id: 'one', type: 'registration.created', eventId: 3, name: 'Secret', email: 'secret@example.com' };
    source.onmessage({ data: JSON.stringify(message) });
    source.onmessage({ data: JSON.stringify(message) });
    source.onmessage({ data: 'broken' });
    source.onmessage({ data: JSON.stringify({ id: 'two', type: 'unknown' }) });
    expect(receive).toHaveBeenCalledExactlyOnceWith({ id: 'one', type: 'registration.created', eventId: 3 });
    stop();
    expect(source.close).toHaveBeenCalledOnce();
  });
});
