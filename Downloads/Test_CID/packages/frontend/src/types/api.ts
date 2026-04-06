import { User, Server, Channel, Message, DirectMessage, DmMessage, ServerMember, FileAttachment } from './models';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface PaginatedMessages {
  messages: Message[];
}

export interface ApiError {
  error: string;
}
