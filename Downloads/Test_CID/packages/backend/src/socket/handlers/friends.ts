import { Server as SocketServer, Socket } from 'socket.io';

// Notify a user if they're online that they received a friend request / action
export function registerFriendHandlers(_io: SocketServer, _socket: Socket) {
  // Friend events are driven by REST (not socket emit), but we use socket
  // to push real-time notifications to the target user.
  // The REST routes emit these events via io after performing DB changes.
  // Nothing to register here for now — see emitFriendEvent helper below.
}

// Called from REST routes to push live notifications to online users
export function emitFriendEvent(io: SocketServer, targetUserId: string, event: string, data: object) {
  io.to(`user:${targetUserId}`).emit(event, data);
}
