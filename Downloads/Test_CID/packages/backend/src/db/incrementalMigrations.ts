import db from './connection';

function columnExists(table: string, name: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === name);
}

/** Recreate channels with CHECK that includes forum (SQLite cannot ALTER CHECK). */
function migrateChannelsAllowForumType() {
  const row = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='channels'`).get() as
    | { sql: string }
    | undefined;
  if (!row?.sql) return;
  if (row.sql.includes("'forum'")) return;

  db.exec('PRAGMA foreign_keys=OFF');
  db.exec('ALTER TABLE channels RENAME TO channels_old');
  db.exec(`
    CREATE TABLE channels (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','voice','announcement','forum')),
      category TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      topic TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  db.exec(`
    INSERT INTO channels (id, server_id, name, type, category, position, topic, created_at)
    SELECT id, server_id, name, type, category, position, topic, created_at FROM channels_old
  `);
  db.exec('DROP TABLE channels_old');
  db.exec('PRAGMA foreign_keys=ON');
  console.log('[migrations] channels table updated for forum type');
}

/**
 * Idempotent steps for existing DBs (schema.sql uses IF NOT EXISTS and skips already-created tables).
 */
export function runIncrementalMigrations() {
  migrateChannelsAllowForumType();

  db.exec(`
    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_forum_posts_channel_created ON forum_posts(channel_id, created_at DESC)',
  );

  if (!columnExists('messages', 'forum_post_id')) {
    try {
      db.exec(
        'ALTER TABLE messages ADD COLUMN forum_post_id TEXT REFERENCES forum_posts(id) ON DELETE CASCADE',
      );
      console.log('[migrations] messages.forum_post_id added');
    } catch (e) {
      console.warn('[migrations] messages.forum_post_id failed', e);
    }
  }

  if (columnExists('messages', 'forum_post_id')) {
    db.exec(
      'CREATE INDEX IF NOT EXISTS idx_messages_forum_post_created ON messages(forum_post_id, created_at DESC)',
    );
  }
}
