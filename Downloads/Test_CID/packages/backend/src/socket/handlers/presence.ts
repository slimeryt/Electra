import { Server, Socket } from 'socket.io';
import db from '../../db/connection';

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = (socket as any).userId;

  // Set user online
  db.prepare("UPDATE users SET status = 'online', updated_at = unixepoch() WHERE id = ?").run(userId);

  // Notify servers this user is in
  const serverIds = (db.prepare(
    'SELECT server_id FROM server_members WHERE user_id = ?'
  ).all(userId) as { server_id: string }[]).map(r => r.server_id);

  // Join personal room for direct notifications (friend requests, etc.)
  socket.join(`user:${userId}`);

  for (const serverId of serverIds) {
    socket.join(`server:${serverId}`);
    socket.to(`server:${serverId}`).emit('user_status_change', { user_id: userId, status: 'online' });
  }

  socket.on('set_status', (data: { status: string }) => {
    const validStatuses = ['online', 'idle', 'dnd', 'offline'];
    if (!validStatuses.includes(data.status)) return;
    db.prepare('UPDATE users SET status = ?, updated_at = unixepoch() WHERE id = ?').run(data.status, userId);
    for (const serverId of serverIds) {
      socket.to(`server:${serverId}`).emit('user_status_change', { user_id: userId, status: data.status });
    }
  });

  socket.on('disconnect', () => {
    db.prepare("UPDATE users SET status = 'offline', updated_at = unixepoch() WHERE id = ?").run(userId);
    for (const serverId of serverIds) {
      socket.to(`server:${serverId}`).emit('user_status_change', { user_id: userId, status: 'offline' });
    }
  });
}
