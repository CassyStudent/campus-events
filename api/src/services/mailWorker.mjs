import { outbox } from '../repositories/outbox.mjs';
import { logger } from '../config/logger.mjs';
export function createMailWorker({ send, jobs = outbox, now = Date.now } = {}) {
  let running;
  let timer;
  async function deliver() {
    for (const job of await jobs.due(new Date(now()))) {
      try {
        await send(job);
        // Remove successes so the outbox only contains pending work.
        await jobs.delivered(job.id);
      } catch {
        const attempts = job.attempts + 1;
        const delay = Math.min(3600000, 1000 * 2 ** Math.min(attempts, 12));
        await jobs.retry(job.id, attempts, new Date(now() + delay));
        // No recipient, body or SMTP credentials in application logs.
        logger.warn('confirmation deferred', { jobId: job.id, attempts });
      }
    }
  }
  function tick() {
    if (!running) running = deliver().finally(() => { running = undefined; });
    return running;
  }
  return {
    tick,
    start() {
      const poll = () => tick().catch(() => logger.error('outbox poll failed'));
      timer = setInterval(poll, 1000);
      timer.unref();
      poll();
    },
    async stop() { clearInterval(timer); await running; }
  };
}
