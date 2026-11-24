import { randomUUID } from 'node:crypto';

const listeners = new Set();
const history = [];

// Only these public fields may leave this service. Never broadcast a registration.
export function publishNotification(type, eventId) {
  const message = { id: randomUUID(), type, eventId };
  history.push(message);
  if (history.length > 200) history.shift();
  for (const listener of listeners) {
    try { listener(message); } catch { listeners.delete(listener); }
  }
}

export function subscribeNotifications(listener, lastId) {
  const index = history.findIndex((message) => message.id === lastId);
  if (index >= 0) for (const message of history.slice(index + 1)) listener(message);
  listeners.add(listener);
  return () => listeners.delete(listener);
}
