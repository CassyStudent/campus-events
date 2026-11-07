import { Op } from 'sequelize';
import { MailJob } from '../db/models.mjs';
import { databaseWork } from './events.mjs';
export const outbox = {
  due: (now) => databaseWork(async () => (await MailJob.findAll({ where: { nextAttemptAt: { [Op.lte]: now } }, order: [['id', 'ASC']], limit: 20 })).map((job) => job.toJSON())),
  delivered: (id) => databaseWork(() => MailJob.destroy({ where: { id } })),
  retry: (id, attempts, nextAttemptAt) => databaseWork(() => MailJob.update({ attempts, nextAttemptAt }, { where: { id } }))
};
