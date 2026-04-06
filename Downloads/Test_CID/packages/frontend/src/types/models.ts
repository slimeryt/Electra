export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
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
}

export interface DirectMessage {
  id: string;
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
