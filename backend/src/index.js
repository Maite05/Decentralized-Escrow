import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setIO } from './lib/io.js';

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] },
});

// Make the io instance available to route handlers without circular imports.
setIO(io);

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const [
  { default: escrowRouter },
  { default: authRouter },
  { closeNotificationQueue },
] = await Promise.all([
  import('./api/escrow.routes.js'),
  import('./api/auth.routes.js'),
  import('./jobs/notificationQueue.js'),
]);

app.use('/escrow', escrowRouter);
app.use('/auth', authRouter);

io.on('connection', (socket) => {
  socket.on('join:project', (projectId) => socket.join(`project:${projectId}`));
  socket.on('leave:project', (projectId) => socket.leave(`project:${projectId}`));
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error('[API Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.API_PORT ?? '4000', 10);
httpServer.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});

// Graceful shutdown — close BullMQ worker before exiting.
async function shutdown(signal) {
  console.log(`[Server] Received ${signal}. Shutting down...`);
  await closeNotificationQueue();
  httpServer.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
