import express from 'express';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.mjs';
import { logger } from './config/logger.mjs';
import { router } from './routes/events.mjs';
import { errorHandler } from './middleware/errors.mjs';
// Compatibility exports for the original test helper and seed command.
export { sequelize, Event, Registration } from './db/models.mjs';
export { seedDemoData } from './db/demo.mjs';
export const app = express();
app.use(express.json());
app.use((req, res, next) => {
  const start = performance.now();
  res.on('finish', () => logger.info('request', { method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - start) }));
  next();
});
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); }, router);
app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route ' + req.method + ' ' + req.originalUrl + ' not found' } }));
if (env.production) {
  const dist = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (req, res) => res.sendFile(dist + 'index.html'));
}
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route ' + req.method + ' ' + req.originalUrl + ' not found' } }));
app.use(errorHandler);
