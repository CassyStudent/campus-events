import { Router, json } from 'express';
import { env } from '../config/env.mjs';
import { handleMcp, mcpParseError, protocolVersions } from '../controllers/mcp.mjs';

export const mcpRouter = Router();
mcpRouter.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const origin = req.get('Origin');
  if (origin && !env.mcpOrigins.includes(origin)) return res.sendStatus(403);
  const version = req.get('MCP-Protocol-Version');
  if (version && !protocolVersions.includes(version)) return res.status(400).json({ error: { code: 'UNSUPPORTED_VERSION', message: 'Unsupported MCP protocol version' } });
  next();
});
mcpRouter.post('/', (req, res, next) => {
  if (!req.is('application/json')) return res.sendStatus(415);
  const accept = req.get('Accept') || '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) return res.sendStatus(406);
  next();
}, json({ limit: '32kb' }), handleMcp);
mcpRouter.all('/', (req, res) => res.set('Allow', 'POST').sendStatus(405));
mcpRouter.use(mcpParseError);
