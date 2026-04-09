import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './src/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10);

export const upload = multer({
  storage,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Allow images, videos, audio, documents
    const allowed = [
      'image/', 'video/', 'audio/',
      'application/pdf', 'application/zip',
      'text/plain', 'application/json',
    ];
    const ok = allowed.some(t => file.mimetype.startsWith(t) || file.mimetype === t);
    cb(null, ok);
  },
});

// In-memory image upload for avatars/icons/banners.
// Stores the file as a base64 data URI in the DB instead of on disk,
// which avoids cross-origin issues when serving images in the Electron app.
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});
