import { Server, Socket } from 'socket.io';
import db from '../../db/connection';

const typingTimers = new Map<string, NodeJS.Timeout>();

export function registerDmHandlers(io: Server, socket: Socket) {
  const userId = (socket as any).userId;

  // Join DM rooms for all user's DMs
  const dmIds = (db.prepare(
    'SELECT dm_id FROM dm_participants WHERE user_id = ?'
  ).all(userId) as { dm_id: string }[]).map(r => r.dm_id);

  for (const dmId of dmIds) {
    socket.join(`dm:${dmId}`);
  }

  socket.on('send_dm', (data: { dm_id: string; content?: string; file_ids?: string[] }, callback?: Function) => {
    try {
      const access = db.prepare('SELECT 1 FROM dm_participants WHERE dm_id = ? AND user_id = ?').get(data.dm_id, userId);
      if (!access) return callback?.({ error: 'Forbidden' });

      const msg = db.transaction(() => {
        const m = db.prepare(
          'INSERT INTO dm_messages (dm_id, author_id, content, type) VALUES (?, ?, ?, ?) RETURNING *'
        ).get(data.dm_id, userId, data.content || null, (data.file_ids?.length ?? 0) > 0 ? 'file' : 'text') as any;

        for (const fileId of data.file_ids ?? []) {
          db.prepare('INSERT INTO dm_attachments (message_id, file_id) VALUES (?, ?)').run(m.id, fileId);
        }

        const author = db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(userId);
        const attachments = db.prepare(`SELECT f.* FROM dm_attachments a JOIN files f ON f.id = a.file_id WHERE a.message_id = ?`).all(m.id);
        return { ...m, author, attachments };
      })();

      // Join new DM room if needed
      socket.join(`dm:${data.dm_id}`);

      io.to(`dm:${data.dm_id}`).emit('dm_message_create', { dm_id: data.dm_id, message: msg });
      callback?.({ ok: true, message: msg });
    } catch (e: any) {
      callback?.({ error: e.message });
    }
  });

  socket.on('start_dm_typing', (data: { dm_id: string }) => {
    const user = (socket as any).user;
    socket.to(`dm:${data.dm_id}`).emit('dm_typing_start', { dm_id: data.dm_id, user_id: userId, display_name: user.display_name });

    const key = `dm:${userId}:${data.dm_id}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.set(key, setTimeout(() => {
      socket.to(`dm:${data.dm_id}`).emit('dm_typing_stop', { dm_id: data.dm_id, user_id: userId });
      typingTimers.delete(key);
    }, 5000));
  });

  socket.on('stop_dm_typing', (data: { dm_id: string }) => {
    const key = `dm:${userId}:${data.dm_id}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
    socket.to(`dm:${data.dm_id}`).emit('dm_typing_stop', { dm_id: data.dm_id, user_id: userId });
  });
}
