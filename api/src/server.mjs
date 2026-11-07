import { app, sequelize, seedDemoData } from './app.mjs';
import { repository } from './repositories/events.mjs';
import { env } from './config/env.mjs';
import { logger } from './config/logger.mjs';
import { createSender } from './mail/sender.mjs';
import { createMailWorker } from './services/mailWorker.mjs';
await sequelize.sync();
if ((await repository.read((repo) => repo.list())).length === 0) await seedDemoData();
const worker = createMailWorker({ send: createSender() });
const server = app.listen(env.port, '0.0.0.0', () => logger.info('Campus Events running', { port: env.port }));
worker.start();
async function shutdown() {
  server.close(async () => {
    await worker.stop();
    await sequelize.close();
  });
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
