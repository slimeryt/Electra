import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { socketAuthMiddleware } from './middleware';
import { registerPresenceHandlers } from './handlers/presence';
import { registerChatHandlers } from './handlers/chat';
import { registerDmHandlers } from './handlers/dm';
import { registerVoiceHandlers } from './handlers/voice';
import { parseCorsOriginList, isDesktopOrOpaqueOrigin } from '../config/corsOrigins';

let _io: SocketServer | null = null;
export function getIo(): SocketServer {
  if (!_io) throw new Error('Socket server not initialized');
  return _io;
}

export function createSocketServer(httpServer: HttpServer) {
  const allowed = parseCorsOriginList();
  const isWildcard = allowed === '*';

  const io = new SocketServer(httpServer, {
    cors: {
      origin: isWildcard
        ? true
        : (origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) => {
            if (isDesktopOrOpaqueOrigin(origin) || (!!origin && allowed.includes(origin))) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
      credentials: !isWildcard,
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
