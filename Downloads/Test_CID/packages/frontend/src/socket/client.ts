import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from '../lib/backendOrigin';

/** Socket.IO emit with callback, rejected if server does not ack within timeout (avoids stuck empty input). */
export function emitWithAck<T = unknown>(
  socket: Socket,
  event: string,
  payload: object,
  timeoutMs = 15_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const t = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Request timed out'));
    }, timeoutMs);
    socket.emit(event, payload, (res: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      resolve(res);
    });
  });
}

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
