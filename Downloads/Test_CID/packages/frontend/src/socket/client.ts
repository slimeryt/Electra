import { io, Socket } from 'socket.io-client';
import { isElectron } from '../env';

// In Electron (prod) there's no Vite proxy, so connect directly to the backend.
// In browser dev, '/' is proxied by Vite to localhost:3001.
const SOCKET_URL = isElectron
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
  : '/';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(token: string) {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
