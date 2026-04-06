import { Router } from 'express';
import path from 'path';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import * as fileService from '../services/fileService';

const router = Router();

router.post('/upload', requireAuth, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let width: number | undefined;
    let height: number | undefined;

    if (req.file.mimetype.startsWith('image/')) {
      try {
        const sharp = (await import('sharp')).default;
        const meta = await sharp(req.file.path).metadata();
        width = meta.width;
        height = meta.height;
      } catch {}
    }

    const file = fileService.saveFile(
      req.userId!,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size,
      width,
      height
    );

    res.status(201).json(file);
  } catch (e) { next(e); }
});

router.get('/:fileId', requireAuth, (req: AuthRequest, res, next) => {
  try {
    const file = fileService.getFile(req.params.fileId);
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './src/uploads');
    res.sendFile(path.join(uploadDir, file.stored_name));
  } catch (e) { next(e); }
});

router.delete('/:fileId', requireAuth, (req: AuthRequest, res, next) => {
  try {
    fileService.deleteFile(req.params.fileId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
