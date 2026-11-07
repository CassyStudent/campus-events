import { repository } from '../repositories/events.mjs';
import { cache } from '../cache/cache.mjs';
import { AppError } from '../errors/AppError.mjs';
async function requireEvent(repo, id) {
  const event = await repo.find(id);
  if (!event) throw new AppError(404, 'NOT_FOUND', 'Event with id ' + id + ' not found');
  return event;
}
async function change(work) {
  const result = await repository.write(work);
  cache.clear();
  return result;
}
export const events = {
  health: async () => { await repository.health(); return { status: 'ok' }; },
  list: () => cache.get('events', () => repository.read((repo) => repo.list())),
  detail: (id) => cache.get('event:' + id, () => repository.read(async (repo) => {
    const event = await requireEvent(repo, id);
    const registered = await repo.count(id);
    return { ...event, registered, spotsLeft: Math.max(event.capacity - registered, 0) };
  })),
  create: (data) => change((repo) => repo.create(data)),
  update: (id, data) => change(async (repo) => { await requireEvent(repo, id); return repo.update(id, data); }),
  remove: (id) => change(async (repo) => { await requireEvent(repo, id); await repo.remove(id); }),
  registrations: (id) => cache.get('registrations:' + id, () => repository.read(async (repo) => {
    await requireEvent(repo, id);
    return repo.registrations(id);
  })),
  register: (id, data) => change(async (repo) => {
    const event = await requireEvent(repo, id);
    if (await repo.existing(id, data.email)) throw new AppError(409, 'CONFLICT', data.email + ' is already registered for this event');
    if (await repo.count(id) >= event.capacity) throw new AppError(409, 'CONFLICT', 'Event is full');
    const registration = await repo.register({ ...data, eventId: id });
    await repo.enqueue({
      recipient: data.email,
      subject: 'You are registered for ' + event.title,
      text: 'Hello ' + data.name + ',\n\nYour registration for ' + event.title + ' is confirmed.\nLocation: ' + event.location + '\nStarts: ' + new Date(event.startsAt).toISOString()
    });
    return registration;
  }),
  async stats() {
    const rows = await cache.get('stats', () => repository.read(async (repo) => {
      const counts = new Map((await repo.counts()).map((row) => [row.eventId, Number(row.count)]));
      return (await repo.list()).map((event) => ({ ...event, registered: counts.get(event.id) || 0 }));
    }));
    return rows.sort((a, b) => a.id - b.id).map((event) => ({
      id: event.id, title: event.title, registered: event.registered, capacity: event.capacity,
      occupancy: Math.round(event.registered / event.capacity * 100) + '%',
      status: event.registered >= event.capacity ? 'full' : pastStatus(event.startsAt)
    }));
  }
};
function pastStatus(startsAt) { return new Date(startsAt) < new Date() ? 'past' : 'open'; }
