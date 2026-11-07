import { events } from '../services/events.mjs';
export const controllers = {
  health: async (req, res) => res.json(await events.health()),
  list: async (req, res) => res.json(await events.list()),
  detail: async (req, res) => res.json(await events.detail(res.locals.params.id)),
  create: async (req, res) => { const event = await events.create(res.locals.body); res.status(201).location('/api/events/' + event.id).json(event); },
  update: async (req, res) => res.json(await events.update(res.locals.params.id, res.locals.body)),
  remove: async (req, res) => { await events.remove(res.locals.params.id); res.status(204).send(); },
  registrations: async (req, res) => res.json(await events.registrations(res.locals.params.id)),
  register: async (req, res) => res.status(201).json(await events.register(res.locals.params.id, res.locals.body)),
  stats: async (req, res) => res.json(await events.stats())
};
