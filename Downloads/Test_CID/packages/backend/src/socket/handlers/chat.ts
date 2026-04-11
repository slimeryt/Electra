import { Server, Socket } from 'socket.io';
import * as messageService from '../../services/messageService';
import * as botService from '../../services/botService';
import db from '../../db/connection';

const typingTimers = new Map<string, NodeJS.Timeout>();

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = (socket as any).userId;

  socket.on('join_channel', (data: { channel_id: string }) => {
    socket.join(`channel:${data.channel_id}`);
  });

  socket.on('leave_channel', (data: { channel_id: string }) => {
    socket.leave(`channel:${data.channel_id}`);
  });

  socket.on('send_message', (data: { channel_id: string; content?: string; file_ids?: string[]; reply_to_id?: string }, callback?: Function) => {
    try {
      // Verify user is member of the server this channel belongs to
      const channel = db.prepare(
        'SELECT c.server_id FROM channels c JOIN server_members sm ON sm.server_id = c.server_id AND sm.user_id = ? WHERE c.id = ?'
      ).get(userId, data.channel_id);

      if (!channel) return callback?.({ error: 'Forbidden' });

      const msg = messageService.createMessage(data.channel_id, userId, data.content, data.file_ids || [], data.reply_to_id);

      // Auto-mod: delete and silently drop if content matches banned words
      const serverRow = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(data.channel_id) as any;
      if (serverRow && botService.checkAutoMod(serverRow.server_id, (msg as any).id, data.content || null)) {
        io.to(`channel:${data.channel_id}`).emit('message_delete', { message_id: (msg as any).id, channel_id: data.channel_id });
        return callback?.({ ok: true, message: msg });
      }

      io.to(`channel:${data.channel_id}`).emit('message_create', msg);

      // Emit mention notifications
      if (data.content) {
        const mentionRegex = /@(\w+)/g;
        const mentioned = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = mentionRegex.exec(data.content)) !== null) {
          mentioned.add(m[1].toLowerCase());
        }
        if (mentioned.size > 0) {
          const serverRow = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(data.channel_id) as any;
          if (serverRow) {
            for (const uname of mentioned) {
              const target = db.prepare(
                'SELECT u.id FROM users u JOIN server_members sm ON sm.user_id = u.id WHERE sm.server_id = ? AND lower(u.username) = ?'
              ).get(serverRow.server_id, uname) as any;
              if (target && target.id !== userId) {
                io.to(`user:${target.id}`).emit('mention_notification', {
                  channel_id: data.channel_id,
                  server_id: serverRow.server_id,
                  message_id: (msg as any).id,
                  author_id: userId,
                });
              }
            }
          }
        }
      }

      callback?.({ ok: true, message: msg });
    } catch (e: any) {
      callback?.({ error: e.message });
    }
  });

  socket.on('edit_message', (data: { message_id: string; content: string }, callback?: Function) => {
    try {
      const msg = messageService.updateMessage(data.message_id, userId, data.content);
      io.to(`channel:${(msg as any).channel_id}`).emit('message_update', {
        message_id: msg.id,
        channel_id: (msg as any).channel_id,
        content: (msg as any).content,
        edited_at: (msg as any).edited_at,
      });
      callback?.({ ok: true });
    } catch (e: any) {
      callback?.({ error: e.message });
    }
  });

  socket.on('delete_message', (data: { message_id: string; channel_id: string }, callback?: Function) => {
    try {
      messageService.deleteMessage(data.message_id, userId);
      io.to(`channel:${data.channel_id}`).emit('message_delete', {
        message_id: data.message_id,
        channel_id: data.channel_id,
      });
      callback?.({ ok: true });
    } catch (e: any) {
      callback?.({ error: e.message });
    }
  });

  socket.on('start_typing', (data: { channel_id: string }) => {
    const user = (socket as any).user;
    socket.to(`channel:${data.channel_id}`).emit('typing_start', {
      channel_id: data.channel_id,
      user_id: userId,
      display_name: user.display_name,
    });

    // Auto stop typing after 5s
    const key = `${userId}:${data.channel_id}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.set(key, setTimeout(() => {
      socket.to(`channel:${data.channel_id}`).emit('typing_stop', { channel_id: data.channel_id, user_id: userId });
      typingTimers.delete(key);
    }, 5000));
  });

  socket.on('stop_typing', (data: { channel_id: string }) => {
    const key = `${userId}:${data.channel_id}`;
    clearTimeout(typingTimers.get(key));
    typingTimers.delete(key);
    socket.to(`channel:${data.channel_id}`).emit('typing_stop', { channel_id: data.channel_id, user_id: userId });
  });
}
