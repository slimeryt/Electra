export const SOCKET_EVENTS = {
  // Auth
  AUTHENTICATED: 'authenticated',
  AUTH: 'auth',

  // Presence
  SET_STATUS: 'set_status',
  USER_STATUS_CHANGE: 'user_status_change',

  // Server/channel subscription
  JOIN_SERVER: 'join_server',
  LEAVE_SERVER: 'leave_server',
  JOIN_CHANNEL: 'join_channel',
  LEAVE_CHANNEL: 'leave_channel',

  // Chat
  SEND_MESSAGE: 'send_message',
  EDIT_MESSAGE: 'edit_message',
  DELETE_MESSAGE: 'delete_message',
  MESSAGE_CREATE: 'message_create',
  MESSAGE_UPDATE: 'message_update',
  MESSAGE_DELETE: 'message_delete',
  START_TYPING: 'start_typing',
  STOP_TYPING: 'stop_typing',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',

  // DMs
  SEND_DM: 'send_dm',
  DM_MESSAGE_CREATE: 'dm_message_create',
  DM_MESSAGE_UPDATE: 'dm_message_update',
  DM_MESSAGE_DELETE: 'dm_message_delete',
  START_DM_TYPING: 'start_dm_typing',
  STOP_DM_TYPING: 'stop_dm_typing',
  DM_TYPING_START: 'dm_typing_start',
  DM_TYPING_STOP: 'dm_typing_stop',

  // Voice
  VOICE_JOIN: 'voice_join',
  VOICE_LEAVE: 'voice_leave',
  VOICE_ROOM_STATE: 'voice_room_state',
  VOICE_USER_JOIN: 'voice_user_join',
  VOICE_USER_LEAVE: 'voice_user_leave',
  VOICE_STATE_UPDATE: 'voice_state_update',
  VOICE_MUTE: 'voice_mute',
  VOICE_DEAFEN: 'voice_deafen',
  VIDEO_TOGGLE: 'video_toggle',
  SCREEN_SHARE_START: 'screen_share_start',
  SCREEN_SHARE_STOP: 'screen_share_stop',

  // WebRTC
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
} as const;
