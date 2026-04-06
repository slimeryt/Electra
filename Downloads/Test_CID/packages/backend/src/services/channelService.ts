import db from '../db/connection';

export function getChannels(serverId: string) {
  return db.prepare(
    'SELECT * FROM channels WHERE server_id = ? ORDER BY position ASC, created_at ASC'
  ).all(serverId);
}

export function createChannel(serverId: string, userId: string, name: string, type: string, category: string | undefined, position: number) {
  const member = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(serverId, userId) as { role: string } | undefined;

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  return db.prepare(
    'INSERT INTO channels (server_id, name, type, category, position) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).get(serverId, name, type || 'text', category || null, position || 0);
}

export function updateChannel(channelId: string, userId: string, updates: Partial<{ name: string; topic: string; position: number; category: string }>) {
  const channel = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as { server_id: string } | undefined;
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 });

  const member = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(channel.server_id, userId) as { role: string } | undefined;

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.values(updates).filter(v => v !== undefined);

  if (!fields) return db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId);

  return db.prepare(`UPDATE channels SET ${fields} WHERE id = ? RETURNING *`).get(...values, channelId);
}

export function deleteChannel(channelId: string, userId: string) {
  const channel = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as { server_id: string } | undefined;
  if (!channel) throw Object.assign(new Error('Channel not found'), { status: 404 });

  const member = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(channel.server_id, userId) as { role: string } | undefined;

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  db.prepare('DELETE FROM channels WHERE id = ?').run(channelId);
}
