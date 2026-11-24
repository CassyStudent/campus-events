import { z } from 'zod';
import { registrationSchema } from '../validation/schemas.mjs';
import { events } from './events.mjs';
import { AppError } from '../errors/AppError.mjs';

const listSchema = z.object({ period: z.enum(['upcoming', 'past', 'all']) }).strict();
const registerSchema = z.object({
  eventId: z.number().int().positive(),
  people: z.array(registrationSchema.strict()).min(1).max(50)
}).strict();

export const tools = [
  {
    name: 'list_events',
    description: 'Find upcoming, past or all campus events. Use returned event IDs for registration. Upcoming means startsAt >= current server time.',
    inputSchema: z.toJSONSchema(listSchema),
    annotations: { readOnlyHint: true }
  },
  {
    name: 'register_for_event',
    description: 'Register one or several people at an event ID. Ask for each person\'s name and email and confirm their intent before calling. All registrations succeed together or none do. Never invent email addresses.',
    inputSchema: z.toJSONSchema(registerSchema),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
  }
];

export async function callTool(name, input) {
  try {
    let data;
    if (name === 'list_events') {
      const { period } = listSchema.parse(input);
      const now = Date.now();
      data = (await events.list()).filter((event) => {
        if (period === 'all') return true;
        const upcoming = new Date(event.startsAt).getTime() >= now;
        return period === 'upcoming' ? upcoming : !upcoming;
      });
    } else if (name === 'register_for_event') {
      const { eventId, people } = registerSchema.parse(input);
      data = await events.registerMany(eventId, people);
    } else {
      return { error: { code: -32602, message: 'Unknown tool: ' + name } };
    }
    return { result: { content: [{ type: 'text', text: JSON.stringify(data) }] } };
  } catch (error) {
    const message = error instanceof z.ZodError ? 'Invalid tool arguments: ' + error.message
      : error instanceof AppError ? error.message : 'Unable to complete this request';
    return { result: { isError: true, content: [{ type: 'text', text: message }] } };
  }
}
