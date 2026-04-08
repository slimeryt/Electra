import path from 'path';
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { getIo } from '../socket/index';
import db from '../db/connection';

// One-time migration
try { db.exec('ALTER TABLE users ADD COLUMN custom_status TEXT'); } catch { /* exists */ }

const router = Router();
router.use(requireAuth);

router.get('/:userId', (req: AuthRequest, res, next) => {
  try {
    const user = db.prepare(
      'SELECT id, username, display_name, avatar_url, status, custom_status FROM users WHERE id = ?'
    ).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

router.patch('/me', (req: AuthRequest, res, next) => {
  try {
    const { display_name, avatar_url, status, custom_status } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (display_name !== undefined)   { fields.push('display_name = ?');  values.push(display_name); }
    if (avatar_url !== undefined)     { fields.push('avatar_url = ?');    values.push(avatar_url); }
    if (custom_status !== undefined)  { fields.push('custom_status = ?'); values.push(custom_status || null); }
    if (status !== undefined) {
      const valid = ['online', 'idle', 'dnd', 'offline'];
      if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      fields.push('status = ?');
      values.push(status);
    }

    if (fields.length === 0) return res.json({ user: req.user });

    fields.push('updated_at = unixepoch()');
    values.push(req.userId);

    const user = db.prepare(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING id, username, display_name, email, avatar_url, status, custom_status`
    ).get(...values) as any;

    // Broadcast custom_status / status changes to servers the user is in
    if (status !== undefined || custom_status !== undefined) {
      try {
        const io = getIo();
        const serverIds = (db.prepare('SELECT server_id FROM server_members WHERE user_id = ?').all(req.userId!) as any[]).map(r => r.server_id);
        for (const sid of serverIds) {
          io.to(`server:${sid}`).emit('user_status_change', { user_id: req.userId, status: user.status, custom_status: user.custom_status });
        }
      } catch { /* socket not ready */ }
    }

    res.json({ user });
  } catch (e) { next(e); }
});

// POST /users/me/avatar — upload image, update avatar_url, return updated user
router.post('/me/avatar', upload.single('avatar'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only images allowed' });
    }

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${backendUrl}/uploads/${req.file.filename}`;

    const user = db.prepare(
      'UPDATE users SET avatar_url = ?, updated_at = unixepoch() WHERE id = ? RETURNING id, username, display_name, email, avatar_url, status, custom_status'
    ).get(avatarUrl, req.userId!) as any;

    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
