import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchNotifications } from '../src/api/events.js';
import LiveToasts from '../src/components/LiveToasts.vue';

vi.mock('../src/api/events.js', () => ({ watchNotifications: vi.fn() }));
describe('LiveToasts', () => {
  afterEach(() => vi.useRealTimers());
  it('shows anonymous messages, dismisses and expires them, and closes on unmount', async () => {
    vi.useFakeTimers();
    let receive;
    const close = vi.fn();
    watchNotifications.mockImplementation((callback) => { receive = callback; return close; });
    const wrapper = mount(LiveToasts);
    receive({ id: 'one', type: 'event.created' });
    receive({ id: 'two', type: 'registration.created', name: 'Secret Name' });
    await flushPromises();
    expect(wrapper.findAll('[role="status"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('A new campus event was created.');
    expect(wrapper.text()).toContain('Someone registered for a campus event.');
    expect(wrapper.text()).not.toContain('Secret');
    await wrapper.find('button').trigger('click');
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(7000);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(0);
    wrapper.unmount();
    expect(close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
