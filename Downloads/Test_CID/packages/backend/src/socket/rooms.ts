// In-memory voice room state
// Map<channelId, Map<userId, { muted, deafened, video, screen }>>
export const voiceRooms = new Map<string, Map<string, {
  userId: string;
  muted: boolean;
  deafened: boolean;
  video: boolean;
  screen: boolean;
}>>();

export function joinVoiceRoom(channelId: string, userId: string) {
  if (!voiceRooms.has(channelId)) {
    voiceRooms.set(channelId, new Map());
  }
  voiceRooms.get(channelId)!.set(userId, { userId, muted: false, deafened: false, video: false, screen: false });
}

export function leaveVoiceRoom(channelId: string, userId: string) {
  voiceRooms.get(channelId)?.delete(userId);
  if (voiceRooms.get(channelId)?.size === 0) {
    voiceRooms.delete(channelId);
  }
}

export function updateVoiceState(channelId: string, userId: string, updates: Partial<{ muted: boolean; deafened: boolean; video: boolean; screen: boolean }>) {
  const room = voiceRooms.get(channelId);
  const user = room?.get(userId);
  if (user) Object.assign(user, updates);
}

export function getVoiceParticipants(channelId: string) {
  return Array.from(voiceRooms.get(channelId)?.values() ?? []);
}
