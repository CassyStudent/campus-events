# MCP and live notifications

## Submission links

- Source: https://github.com/CassyStudent/campus-events (public)
- Website: https://cassy-campus-events.alwaysdata.net/
- MCP endpoint: https://cassy-campus-events.alwaysdata.net/mcp

## Connect an assistant

In an MCP-compatible client that supports remote Streamable HTTP servers, add a server named **Campus Events** with the endpoint above. This demo has no authentication, matching the original public event API. No AI model runs inside this app: the connected assistant translates the user's sentence into a structured tool call. The client needs to support MCP version `2025-06-18` or `2025-03-26`. HTTP JSON responses are used; persistent MCP sessions and MCP SSE are not required. The frontend's notification stream is a separate endpoint.

Try these prompts:

- “Get me all upcoming events.” → `list_events` with `period: "upcoming"`.
- “Get me all past events.” → `list_events` with `period: "past"`.
- “Register Ada (ada@example.com) and Grace (grace@example.com) at event 3.” → `register_for_event` with the event ID and two people. Use an existing event with enough seats. If a name, email or event is ambiguous, the assistant should ask rather than guess.

The tool descriptions tell the assistant to ask for missing details and confirm the user's intent. Server-side validation still applies even if an assistant ignores these instructions. One registration needs one name and one email; a group can have up to 50 people. Registration follows the existing event rules, including capacity and duplicate checks.

## Inspect the protocol directly

For example, in PowerShell:

```powershell
$uri = 'https://cassy-campus-events.alwaysdata.net/mcp'
$headers = @{ Accept = 'application/json, text/event-stream'; 'MCP-Protocol-Version' = '2025-06-18' }
$body = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"class-demo","version":"1.0"}}}'
Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body $body

$body = '{"jsonrpc":"2.0","method":"notifications/initialized"}'
Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body $body

$body = '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body $body

$body = '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_events","arguments":{"period":"upcoming"}}}'
Invoke-RestMethod -Uri $uri -Method Post -ContentType 'application/json' -Headers $headers -Body $body
```

A registration tool call looks like this. It changes data, so use fictional demonstration addresses and an actual event ID with space:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "register_for_event",
    "arguments": {
      "eventId": 3,
      "people": [
        { "name": "Ada", "email": "ada@example.com" },
        { "name": "Grace", "email": "grace@example.com" }
      ]
    }
  }
}
```

## Explain the main code

1. `api/src/routes/mcp.mjs` validates browser Origin, HTTP content negotiation and the protocol-version header. It accepts JSON POSTs and rejects GET with 405, which the MCP transport permits for servers without an MCP SSE stream.
2. `api/src/controllers/mcp.mjs` reads JSON-RPC envelopes. `initialize` declares the tools capability, `tools/list` describes the tools, and `tools/call` delegates to the service. Protocol mistakes return JSON-RPC errors; business failures return tool results marked `isError`.
3. `api/src/services/mcpTools.mjs` publishes Zod-derived JSON schemas and validates arguments. Listing filters cached events against the current time. Registration calls the same service used by REST; it cannot bypass the database transaction or capacity checks.
4. `events.registerMany()` calls the shared registration routine for every person within one database transaction. Each registration and its email job commit together. If any person fails, everything rolls back. Cache invalidation and notifications happen after commit.
5. `api/src/services/notifications.mjs` creates one random message ID for each committed registration or created event. It constructs a small public payload instead of broadcasting a registration object. It fans messages out to all subscribers and retains the latest 200 for short reconnects.
6. `api/src/controllers/notifications.mjs` writes SSE frames to each connection, sends heartbeat comments, disables proxy buffering and unsubscribes when a page disconnects. A slow/disconnected browser cannot undo a saved registration.
7. `web/src/api/events.js` opens an `EventSource`. The browser reconnects automatically and sends its last SSE event ID. A bounded set of IDs suppresses replays. Only public fields are passed to the UI.
8. `web/src/components/LiveToasts.vue` mounts once in `App.vue`, so changing routes does not add streams. It shows generic messages, supports dismissal and removes messages after seven seconds. It closes its stream and clears timers on unmount.

## Classroom demonstration

1. Open the website in two browser windows (or two browsers).
2. Create an event in one window. Both windows should show one “A new campus event was created” toast.
3. Register one fictional participant. Both windows should show one “Someone registered” toast, with no name or email.
4. Retry the same registration. It should be rejected and produce no new toast.
5. Connect the MCP client, list upcoming/past events, then register a group. Every browser should receive one toast per person. A group of two produces two toasts, not one group toast plus two participant toasts.
6. Try a group larger than the remaining capacity. Verify no participants or mail jobs were partially saved and no toast appeared.

## Verification and limits

The public deployment was verified on **24 November 2026**. MCP initialization and tool discovery worked, upcoming/past queries returned the correct events, and a group of two was saved. Two open pages each received one creation toast and one anonymous toast per registration. Duplicate and over-capacity groups were rejected; the failed group saved no partial registrations. Event 5, **Creative Campus Meetup**, retained its three fictional test participants and one remaining seat after a hosting restart. Health and MCP discovery also passed after restart.

`npm run check` runs lint and all 56 tests. `npm run build` compiles production assets. New tests exercise MCP initialization/discovery/calls, current-time filtering, argument validation, origin/version rejection, group transactions, privacy, two real HTTP SSE connections, rollback without notifications, reconnect replay, duplicate suppression, toast dismissal/expiry and cleanup.

This assignment uses one Node process. Notification history is memory-only and limited to 200 messages; offline browsers, long disconnections and restarts can miss messages. Deduplication is scoped to the current page session, so each open tab receives its own toast. For multiple server processes, use shared pub/sub and persistent event history. These notifications do not include participant identities; the original registration-list endpoint still exposes registrations, so use fictional data in this public demo. Production access control would need to protect REST and MCP together. Browser Origin validation is not authentication.

SMTP credentials remain unconfigured on the demo host. Registrations and pending mail jobs are safely saved, and SMTP retry activity does not generate duplicate toasts.

## Primary references

- [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports): JSON POST/response transport, Accept headers, Origin checks and optional GET/SSE.
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools): tool discovery, JSON schemas, calls and tool-error results.
