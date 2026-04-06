import db from './connection';
import fs from 'fs';
import path from 'path';

export function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  // Run PRAGMAs separately
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Split and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.toUpperCase().startsWith('PRAGMA'));

  // Run CREATE TABLE / CREATE INDEX statements
  db.transaction(() => {
    for (const stmt of statements) {
      if (stmt) {
        try {
          db.prepare(stmt + ';').run();
        } catch (e: any) {
          // Ignore "already exists" errors for idempotency
          if (!e.message?.includes('already exists')) {
            throw e;
          }
        }
      }
    }
  })();

  console.log('Database migrations complete');
}
