export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  banner_url?: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  custom_status?: string | null;
  bio?: string | null;
  accent_color?: string | null;
  username_font?: string | null;
  theme?: string | null;
  verified?: number;
  badges?: string; // JSON array string e.g. '["early_access","staff"]'
  show_badges?: number; // 1 = show, 0 = hide
  created_at: number;
  updated_at: number;
}

export interface Server {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
  banner_url?: string | null;
  verified?: number;
  created_at: number;
  role?: 'owner' | 'admin' | 'member';
  member_count?: number;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  category: string | null;
  position: number;
  topic: string | null;
  created_at: number;
}

export interface MessageAuthor {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface ReplyPreview {
  id: string;
  content: string | null;
  author: MessageAuthor | null;
}

export interface FileAttachment {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string | null;
  type: 'text' | 'file' | 'system';
  edited_at: number | null;
  created_at: number;
  author: MessageAuthor | null;
  attachments: FileAttachment[];
  reply_to_id?: string | null;
  reply_to?: ReplyPreview | null;
}

export interface DirectMessage {
  id: string;
  name?: string | null;
  is_group?: number;
  created_at: number;
  participants: User[];
}

export interface DmMessage {
  id: string;
  dm_id: string;
  author_id: string;
  content: string | null;
  type: 'text' | 'file' | 'system';
  edited_at: number | null;
  created_at: number;
  author: MessageAuthor | null;
  attachments: FileAttachment[];
  reply_to_id?: string | null;
  reply_to?: ReplyPreview | null;
}

export interface ServerMember {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: User['status'];
  role: 'owner' | 'admin' | 'member';
  joined_at: number;
}

export interface VoiceParticipant {
  userId: string;
  muted: boolean;
  deafened: boolean;
  video: boolean;
  screen: boolean;
  user?: MessageAuthor;
}

export interface ServerRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  permissions: number;
  hoist: number;
  is_default: number;
  created_at: number;
}

export interface ServerMemberWithRoles extends ServerMember {
  roles?: ServerRole[];
}

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface Friend {
  id: string;
  status: FriendStatus;
  direction: 'incoming' | 'outgoing' | 'accepted';
  created_at: number;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    status: User['status'];
  };
}

export const Permissions = {
  SEND_MESSAGES:    1 << 0,
  ATTACH_FILES:     1 << 1,
  MANAGE_MESSAGES:  1 << 2,
  MENTION_EVERYONE: 1 << 3,
  VIEW_CHANNELS:    1 << 4,
  MANAGE_CHANNELS:  1 << 5,
  MANAGE_ROLES:     1 << 6,
  KICK_MEMBERS:     1 << 7,
  BAN_MEMBERS:      1 << 8,
  MANAGE_SERVER:    1 << 9,
  ADMINISTRATOR:    1 << 30,
} as const;
