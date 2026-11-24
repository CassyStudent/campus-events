import { tools, callTool } from '../services/mcpTools.mjs';

export const protocolVersions = ['2025-06-18', '2025-03-26'];
const failure = (res, id, code, message, status = 200) => res.status(status).json({ jsonrpc: '2.0', id, error: { code, message } });

// A small, stateless Streamable HTTP server: JSON replies, no MCP SSE sessions.
export async function handleMcp(req, res) {
  const body = req.body;
  if (!validEnvelope(body)) {
    return failure(res, null, -32600, 'Invalid Request', 400);
  }
  if (body.id === undefined) return res.sendStatus(202);
  if (!['string', 'number'].includes(typeof body.id)) return failure(res, null, -32600, 'Invalid request id', 400);
  const { id, method, params = {} } = body;
  if (!params || typeof params !== 'object' || Array.isArray(params)) return failure(res, id, -32602, 'Invalid params');
  return dispatch(res, id, method, params);
}

function validEnvelope(body) {
  return body && !Array.isArray(body) && body.jsonrpc === '2.0' && typeof body.method === 'string';
}

async function dispatch(res, id, method, params) {
  switch (method) {
    case 'initialize':
      return res.json({ jsonrpc: '2.0', id, result: {
        protocolVersion: protocolVersions.includes(params.protocolVersion) ? params.protocolVersion : protocolVersions[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'campus-events', version: '1.0.0' },
        instructions: 'Use list_events to find event IDs. Ask for missing names/emails before registration.'
      } });
    case 'ping': return res.json({ jsonrpc: '2.0', id, result: {} });
    case 'tools/list': return res.json({ jsonrpc: '2.0', id, result: { tools } });
    case 'tools/call': return res.json({ jsonrpc: '2.0', id, ...await callTool(params.name, params.arguments) });
    default: return failure(res, id, -32601, 'Method not found');
  }
}

export function mcpParseError(error, req, res, next) {
  if (error.type === 'entity.parse.failed') return failure(res, null, -32700, 'Parse error', 400);
  next(error);
}
