import db from '../db/connection';
import fs from 'fs';
import path from 'path';

export function saveFile(uploaderId: string, originalName: string, storedName: string, mimeType: string, sizeBytes: number, width?: number, height?: number) {
  return db.prepare(
    'INSERT INTO files (uploader_id, original_name, stored_name, mime_type, size_bytes, width, height) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *'
  ).get(uploaderId, originalName, storedName, mimeType, sizeBytes, width || null, height || null);
}

export function getFile(fileId: string) {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as { stored_name: string; mime_type: string; original_name: string } | undefined;
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
  return file;
}

export function deleteFile(fileId: string, userId: string) {
  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as { id: string; uploader_id: string; stored_name: string } | undefined;
  if (!file) throw Object.assign(new Error('File not found'), { status: 404 });
  if (file.uploader_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './src/uploads');
  const filePath = path.join(uploadDir, file.stored_name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
}
