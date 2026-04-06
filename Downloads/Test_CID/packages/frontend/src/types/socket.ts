import { Message, DmMessage, User, Channel, Server, VoiceParticipant } from './models';

export interface ServerToClientEvents {
  authenticated: (data: { user: User }) => void;
  error: (data: { code: string; message: string }) => void;

  // Presence
  user_status_change: (data: { user_id: string; status: User['status'] }) => void;
  member_join: (data: { server_id: string; member: any }) => void;
  member_leave: (data: { server_id: string; user_id: string }) => void;

  // Messages
  message_create: (message: Message) => void;
  message_update: (data: { message_id: string; content: string; edited_at: number }) => void;
  message_delete: (data: { message_id: string; channel_id: string }) => void;
  typing_start: (data: { channel_id: string; user_id: string; display_name: string }) => void;
  typing_stop: (data: { channel_id: string; user_id: string }) => void;

  // DMs
  dm_message_create: (data: { dm_id: string; message: DmMessage }) => void;
  dm_message_update: (data: { dm_id: string; message_id: string; content: string; edited_at: number }) => void;
  dm_message_delete: (data: { dm_id: string; message_id: string }) => void;
  dm_typing_start: (data: { dm_id: string; user_id: string; display_name: string }) => void;
  dm_typing_stop: (data: { dm_id: string; user_id: string }) => void;

  // Voice
  voice_room_state: (data: { channel_id: string; participants: VoiceParticipant[] }) => void;
  voice_user_join: (data: { channel_id: string; user_id: string; user: any }) => void;
  voice_user_leave: (data: { channel_id: string; user_id: string }) => void;
  webrtc_offer: (data: { from_user_id: string; sdp: RTCSessionDescriptionInit; channel_id: string }) => void;
  webrtc_answer: (data: { from_user_id: string; sdp: RTCSessionDescriptionInit; channel_id: string }) => void;
  webrtc_ice_candidate: (data: { from_user_id: string; candidate: RTCIceCandidateInit; channel_id: string }) => void;
  voice_state_update: (data: { channel_id: string; user_id: string; muted?: boolean; deafened?: boolean; video?: boolean; screen?: boolean }) => void;

  // Server/channel events
  server_update: (server: Server) => void;
  channel_create: (channel: Channel) => void;
  channel_update: (channel: Channel) => void;
  channel_delete: (data: { channel_id: string; server_id: string }) => void;
}
