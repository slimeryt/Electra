import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../db/connection';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = db.prepare(
      'SELECT id, username, display_name, email, avatar_url, status FROM users WHERE id = ?'
    ).get(payload.userId) as any;

    if (!user) return next(new Error('User not found'));

    (socket as any).userId = user.id;
    (socket as any).user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
