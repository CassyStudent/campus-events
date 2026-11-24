import { subscribeNotifications } from '../services/notifications.mjs';

export function streamNotifications(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');
  const unsubscribe = subscribeNotifications((message) => {
    // A slow/disconnected client must never block a committed registration.
    if (!res.destroyed && !res.write('id: ' + message.id + '\ndata: ' + JSON.stringify(message) + '\n\n')) res.destroy();
  }, req.get('Last-Event-ID'));
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
  heartbeat.unref();
  res.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
}
