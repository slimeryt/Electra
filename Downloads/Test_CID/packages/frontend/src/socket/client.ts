import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from '../lib/backendOrigin';

// Browser dev: '/' — Vite proxies socket.io. Electron & Capacitor: full backend origin.
const SOCKET_URL = getBackendOrigin() || '/';

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
