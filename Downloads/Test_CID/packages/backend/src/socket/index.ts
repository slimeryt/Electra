import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { socketAuthMiddleware } from './middleware';
import { registerPresenceHandlers } from './handlers/presence';
import { registerChatHandlers } from './handlers/chat';
import { registerDmHandlers } from './handlers/dm';
import { registerVoiceHandlers } from './handlers/voice';

let _io: SocketServer | null = null;
export function getIo(): SocketServer {
  if (!_io) throw new Error('Socket server not initialized');
  return _io;
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  _io = io;
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${(socket as any).user?.username} (${socket.id})`);

    socket.emit('authenticated', { user: (socket as any).user });

    registerPresenceHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerDmHandlers(io, socket);
    registerVoiceHandlers(io, socket);
  });

  return io;
}
