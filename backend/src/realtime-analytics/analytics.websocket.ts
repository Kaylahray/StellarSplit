// WebSocket delivery for real-time metrics
import { Server } from 'ws';
import { PlatformMetrics } from './analytics.metrics';

const wss = new Server({ port: Number(process.env.WS_PORT) || 5000 });

export function broadcastMetrics(metric: PlatformMetrics) {
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(metric));
    }
  });
}

wss.on('connection', ws => {
  ws.send('Connected to real-time analytics');
});
