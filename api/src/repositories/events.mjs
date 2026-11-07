import { Transaction } from 'sequelize';
import { Event, Registration, MailJob, sequelize } from '../db/models.mjs';

// SQLite has one writer. Queue database work so requests cannot accidentally
// share the connection while a managed transaction is active (also in tests).
let tail = Promise.resolve();
export function databaseWork(work) {
  const result = tail.then(work);
  tail = result.catch(() => {});
  return result;
}
const plain = (row) => row?.toJSON() ?? null;
function context(transaction) {
  const options = { transaction };
  return {
    find: async (id) => plain(await Event.findByPk(id, options)),
    list: async () => (await Event.findAll({ ...options, order: [['startsAt', 'ASC']] })).map(plain),
    create: async (data) => plain(await Event.create(data, options)),
    update: async (id, data) => { await Event.update(data, { ...options, where: { id } }); return plain(await Event.findByPk(id, options)); },
    remove: (id) => Event.destroy({ ...options, where: { id } }),
    registrations: async (eventId) => (await Registration.findAll({ ...options, where: { eventId }, order: [['createdAt', 'ASC'], ['id', 'ASC']] })).map(plain),
    count: (eventId) => Registration.count({ ...options, where: { eventId } }),
    existing: async (eventId, email) => plain(await Registration.findOne({ ...options, where: { eventId, email } })),
    register: async (data) => plain(await Registration.create(data, options)),
    enqueue: (data) => MailJob.create(data, options),
    counts: () => Registration.findAll({ ...options, attributes: ['eventId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['eventId'], raw: true })
  };
}
export const repository = {
  read: (work) => databaseWork(() => work(context())),
  write: (work) => databaseWork(() => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, (transaction) => work(context(transaction)))),
  health: () => databaseWork(() => sequelize.authenticate())
};
