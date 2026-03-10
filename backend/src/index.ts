import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config';
import authRouter from './routes/auth';
import roomsRouter from './routes/rooms';
import { setupSocket } from './socket/gameSocket';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [config.frontendUrl, 'https://web.telegram.org', 'http://localhost:5173'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(cors({
  origin: [config.frontendUrl, 'https://web.telegram.org', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api/auth', authRouter);
app.use('/api/rooms', roomsRouter);

setupSocket(io);

httpServer.listen(config.port, () => {
  console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
});

export { app, io };
