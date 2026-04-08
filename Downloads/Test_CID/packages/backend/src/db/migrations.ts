import db from './connection';
import fs from 'fs';
import path from 'path';

/**
 * Apply schema.sql. Uses db.exec() on the whole DDL blob instead of splitting on ";",
 * which is fragile (e.g. section comments glued to CREATE TABLE, or future semicolons
 * inside CHECK/defaults).
 */
export function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  const ddl = schema
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (t.startsWith('--')) return false;
      if (/^PRAGMA\s+/i.test(t)) return false;
      return true;
    })
    .join('\n')
    .trim();

  if (!ddl) {
    console.warn('migrations: no DDL left after stripping comments/PRAGMAs');
    return;
  }

  db.transaction(() => {
    db.exec(ddl);
  })();

  console.log('Database migrations complete');
}
