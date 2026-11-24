import path from 'node:path';
import { fileURLToPath } from 'node:url';
const apiRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.env.NODE_ENV !== 'test') {
  try { process.loadEnvFile(path.join(apiRoot, '.env')); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
export const env = {
  host: process.env.IP || process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  mcpOrigins: (process.env.MCP_ORIGINS || 'http://localhost:3000,http://localhost:5173,https://cassy-campus-events.alwaysdata.net').split(',').map((origin) => origin.trim()),
  test: process.env.NODE_ENV === 'test',
  production: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  storage: process.env.DB_STORAGE || path.join(apiRoot, 'data/events.sqlite'),
  smtpUrl: process.env.SMTP_URL,
  mailFrom: process.env.MAIL_FROM || 'Campus Events <events@example.com>'
};
