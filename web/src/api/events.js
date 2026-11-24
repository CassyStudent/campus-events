import { request } from './client.js';

export const getEvents = () => request('/events');
export const getEvent = (id) => request(`/events/${id}`);
export const createEvent = (event) => request('/events', { method: 'POST', body: event });
export const deleteEvent = (id) => request(`/events/${id}`, { method: 'DELETE' });

export const getRegistrations = (eventId) => request(`/events/${eventId}/registrations`);
export const register = (eventId, participant) =>
  request(`/events/${eventId}/registrations`, { method: 'POST', body: participant });

export const getStats = () => request('/stats');

export function watchNotifications(onMessage) {
  const source = new EventSource('/api/notifications');
  const seen = new Set();
  source.onmessage = (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (!message.id || seen.has(message.id)) return;
    if (!['event.created', 'registration.created'].includes(message.type)) return;
    seen.add(message.id);
    if (seen.size > 200) seen.delete(seen.values().next().value);
    // Only public fields enter the UI, even if a server accidentally sends more.
    onMessage({ id: message.id, type: message.type, eventId: message.eventId });
  };
  return () => source.close();
}
