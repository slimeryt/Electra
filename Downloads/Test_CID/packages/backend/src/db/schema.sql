PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'offline' CHECK(status IN ('online','idle','dnd','offline')),
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS servers (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name        TEXT NOT NULL,
  description TEXT,
  icon_url    TEXT,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(6)))),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS server_members (
  server_id  TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('owner','admin','member')),
  joined_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (server_id, user_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  server_id   TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','voice','announcement')),
  category    TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  topic       TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS files (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uploader_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  original_name TEXT NOT NULL,
  stored_name   TEXT NOT NULL UNIQUE,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  width         INTEGER,
  height        INTEGER,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  channel_id  TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  content     TEXT,
  type        TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','file','system')),
  edited_at   INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS attachments (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_id    TEXT NOT NULL REFERENCES files(id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS dm_participants (
  dm_id   TEXT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  PRIMARY KEY (dm_id, user_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  dm_id      TEXT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
  author_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT,
  type       TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text','file','system')),
  edited_at  INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_dm_created ON dm_messages(dm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dm_attachments (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT NOT NULL REFERENCES dm_messages(id) ON DELETE CASCADE,
  file_id    TEXT NOT NULL REFERENCES files(id)        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
