import { Server, Socket } from 'socket.io';
import { joinVoiceRoom, leaveVoiceRoom, updateVoiceState, getVoiceParticipants, voiceRooms } from '../rooms';
import db from '../../db/connection';

function leaveSocketVoiceRoom(io: Server, socket: Socket, uid: string, channelId: string) {
  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as any;
  leaveVoiceRoom(channelId, uid);
  socket.leave(`voice:${channelId}`);
  const leavePayload = { channel_id: channelId, user_id: uid };
  io.to(`voice:${channelId}`).emit('voice_user_leave', leavePayload);
  if (ch?.server_id) socket.to(`server:${ch.server_id}`).emit('voice_user_leave', leavePayload);
}

export function registerVoiceHandlers(io: Server, socket: Socket) {
  const userId = (socket as any).userId;
  const user = (socket as any).user;

  socket.on('voice_join', (data: { channel_id: string }, callback?: Function) => {
    try {
      // Verify access
      const channel = db.prepare(
        'SELECT c.id, c.server_id FROM channels c JOIN server_members sm ON sm.server_id = c.server_id AND sm.user_id = ? WHERE c.id = ? AND c.type = ?'
      ).get(userId, data.channel_id, 'voice') as any;

      if (!channel) return callback?.({ error: 'Forbidden or not a voice channel' });

      const prevVoiceChannelId = (socket as any).voiceChannelId as string | undefined;
      if (prevVoiceChannelId && prevVoiceChannelId !== data.channel_id) {
        leaveSocketVoiceRoom(io, socket, userId, prevVoiceChannelId);
      }

      joinVoiceRoom(data.channel_id, userId);
      socket.join(`voice:${data.channel_id}`);
      (socket as any).voiceChannelId = data.channel_id;

      const participants = getVoiceParticipants(data.channel_id).map(p => ({
        ...p,
        user: db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(p.userId),
      }));

      // Tell the joining user about existing participants
      socket.emit('voice_room_state', { channel_id: data.channel_id, participants });

      // Tell everyone in the voice room + server room about the new joiner
      const joinPayload = { channel_id: data.channel_id, user_id: userId, user };
      socket.to(`voice:${data.channel_id}`).emit('voice_user_join', joinPayload);
      socket.to(`server:${channel.server_id}`).emit('voice_user_join', joinPayload);

      callback?.({ ok: true });
    } catch (e: any) {
      callback?.({ error: e.message });
    }
  });

  socket.on('voice_leave', (data: { channel_id: string }) => {
    leaveSocketVoiceRoom(io, socket, userId, data.channel_id);
    if ((socket as any).voiceChannelId === data.channel_id) {
      (socket as any).voiceChannelId = undefined;
    }
  });

  // WebRTC signaling relay
  socket.on('webrtc_offer', (data: { channel_id: string; target_user_id: string; sdp: RTCSessionDescriptionInit }) => {
    const targetSocket = findSocketByUserId(io, data.target_user_id);
    targetSocket?.emit('webrtc_offer', { from_user_id: userId, sdp: data.sdp, channel_id: data.channel_id });
  });

  socket.on('webrtc_answer', (data: { channel_id: string; target_user_id: string; sdp: RTCSessionDescriptionInit }) => {
    const targetSocket = findSocketByUserId(io, data.target_user_id);
    targetSocket?.emit('webrtc_answer', { from_user_id: userId, sdp: data.sdp, channel_id: data.channel_id });
  });

  socket.on('webrtc_ice_candidate', (data: { channel_id: string; target_user_id: string; candidate: RTCIceCandidateInit }) => {
    const targetSocket = findSocketByUserId(io, data.target_user_id);
    targetSocket?.emit('webrtc_ice_candidate', { from_user_id: userId, candidate: data.candidate, channel_id: data.channel_id });
  });

  // Voice state updates
  socket.on('voice_mute', (data: { channel_id: string; muted: boolean }) => {
    updateVoiceState(data.channel_id, userId, { muted: data.muted });
    socket.to(`voice:${data.channel_id}`).emit('voice_state_update', { channel_id: data.channel_id, user_id: userId, muted: data.muted });
  });

  socket.on('voice_deafen', (data: { channel_id: string; deafened: boolean }) => {
    updateVoiceState(data.channel_id, userId, { deafened: data.deafened });
    socket.to(`voice:${data.channel_id}`).emit('voice_state_update', { channel_id: data.channel_id, user_id: userId, deafened: data.deafened });
  });

  socket.on('video_toggle', (data: { channel_id: string; enabled: boolean }) => {
    updateVoiceState(data.channel_id, userId, { video: data.enabled });
    socket.to(`voice:${data.channel_id}`).emit('voice_state_update', { channel_id: data.channel_id, user_id: userId, video: data.enabled });
  });

  socket.on('screen_share_start', (data: { channel_id: string }) => {
    updateVoiceState(data.channel_id, userId, { screen: true });
    socket.to(`voice:${data.channel_id}`).emit('voice_state_update', { channel_id: data.channel_id, user_id: userId, screen: true });
  });

  socket.on('screen_share_stop', (data: { channel_id: string }) => {
    updateVoiceState(data.channel_id, userId, { screen: false });
    socket.to(`voice:${data.channel_id}`).emit('voice_state_update', { channel_id: data.channel_id, user_id: userId, screen: false });
  });

  socket.on('disconnect', () => {
    const tracked = (socket as any).voiceChannelId as string | undefined;
    if (tracked) {
      leaveSocketVoiceRoom(io, socket, userId, tracked);
    } else {
      for (const [channelId, room] of Array.from(voiceRooms.entries()) as [string, Map<string, any>][]) {
        if (room.has(userId)) {
          leaveSocketVoiceRoom(io, socket, userId, channelId);
        }
      }
    }
    (socket as any).voiceChannelId = undefined;
  });
}

function findSocketByUserId(io: Server, userId: string): Socket | undefined {
  for (const [, socket] of io.sockets.sockets) {
    if ((socket as any).userId === userId) return socket;
  }
  return undefined;
}
