import db from '../db/connection';

export interface ServerCategory {
  id: string;
  server_id: string;
  name: string;
  position: number;
}

function requireAdminOrOwner(serverId: string, userId: string) {
  const member = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(serverId, userId) as { role: string } | undefined;
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

export function getCategories(serverId: string): ServerCategory[] {
  // Auto-create entries for any channel categories not yet in the table
  const channelCats = db.prepare(
    'SELECT DISTINCT category FROM channels WHERE server_id = ? AND category IS NOT NULL'
  ).all(serverId) as { category: string }[];

  for (const { category } of channelCats) {
    db.prepare(
      `INSERT OR IGNORE INTO server_categories (server_id, name, position)
       VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM server_categories WHERE server_id = ?))`
    ).run(serverId, category, serverId);
  }

  return db.prepare(
    'SELECT * FROM server_categories WHERE server_id = ? ORDER BY position ASC'
  ).all(serverId) as ServerCategory[];
}

export function createCategory(serverId: string, userId: string, name: string): ServerCategory {
  requireAdminOrOwner(serverId, userId);
  const pos = (db.prepare(
    'SELECT COALESCE(MAX(position), -1) + 1 AS p FROM server_categories WHERE server_id = ?'
  ).get(serverId) as { p: number }).p;
  return db.prepare(
    'INSERT INTO server_categories (server_id, name, position) VALUES (?, ?, ?) RETURNING *'
  ).get(serverId, name.trim(), pos) as ServerCategory;
}

export function updateCategory(serverId: string, catId: string, userId: string, updates: Partial<{ name: string; position: number }>): ServerCategory {
  requireAdminOrOwner(serverId, userId);
  const fields = Object.entries(updates)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.values(updates).filter(v => v !== undefined);
  if (!fields) return db.prepare('SELECT * FROM server_categories WHERE id = ?').get(catId) as ServerCategory;
  // If renaming, update channels too
  if (updates.name) {
    const cat = db.prepare('SELECT name FROM server_categories WHERE id = ?').get(catId) as { name: string } | undefined;
    if (cat) {
      db.prepare('UPDATE channels SET category = ? WHERE server_id = ? AND category = ?')
        .run(updates.name, serverId, cat.name);
    }
  }
  return db.prepare(`UPDATE server_categories SET ${fields} WHERE id = ? RETURNING *`).get(...values, catId) as ServerCategory;
}

export function deleteCategory(serverId: string, catId: string, userId: string): void {
  requireAdminOrOwner(serverId, userId);
  const cat = db.prepare('SELECT name FROM server_categories WHERE id = ? AND server_id = ?').get(catId, serverId) as { name: string } | undefined;
  if (!cat) throw Object.assign(new Error('Category not found'), { status: 404 });
  // Null out channels in this category
  db.prepare('UPDATE channels SET category = NULL WHERE server_id = ? AND category = ?').run(serverId, cat.name);
  db.prepare('DELETE FROM server_categories WHERE id = ?').run(catId);
}
