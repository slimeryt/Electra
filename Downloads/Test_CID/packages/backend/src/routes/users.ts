import path from 'path';
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';
import { getIo } from '../socket/index';
import db from '../db/connection';

// One-time migrations
try { db.exec('ALTER TABLE users ADD COLUMN custom_status TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN bio TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN accent_color TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN banner_url TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN username_font TEXT'); } catch { /* exists */ }

const PROFILE_FIELDS = 'id, username, display_name, email, avatar_url, banner_url, status, custom_status, bio, accent_color, username_font';

const router = Router();
router.use(requireAuth);

router.get('/:userId', (req: AuthRequest, res, next) => {
  try {
    const user = db.prepare(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`
    ).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

router.patch('/me', (req: AuthRequest, res, next) => {
  try {
    const { display_name, avatar_url, status, custom_status, bio, accent_color, username_font } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (display_name !== undefined)   { fields.push('display_name = ?');  values.push(display_name); }
    if (avatar_url !== undefined)     { fields.push('avatar_url = ?');    values.push(avatar_url); }
    if (custom_status !== undefined)  { fields.push('custom_status = ?'); values.push(custom_status || null); }
    if (bio !== undefined)            { fields.push('bio = ?');           values.push(bio || null); }
    if (accent_color !== undefined)   { fields.push('accent_color = ?');  values.push(accent_color || null); }
    if (username_font !== undefined)  { fields.push('username_font = ?'); values.push(username_font || null); }
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
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING ${PROFILE_FIELDS}`
    ).get(...values) as any;

    // Broadcast status changes to servers the user is in
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

// POST /users/me/avatar — upload image, store as data URI
router.post('/me/avatar', imageUpload.single('avatar'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const user = db.prepare(
      `UPDATE users SET avatar_url = ?, updated_at = unixepoch() WHERE id = ? RETURNING ${PROFILE_FIELDS}`
    ).get(avatarUrl, req.userId!) as any;
    res.json({ user });
  } catch (e) { next(e); }
});

// POST /users/me/banner — upload banner image/GIF, store as data URI
router.post('/me/banner', imageUpload.single('banner'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const bannerUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const user = db.prepare(
      `UPDATE users SET banner_url = ?, updated_at = unixepoch() WHERE id = ? RETURNING ${PROFILE_FIELDS}`
    ).get(bannerUrl, req.userId!) as any;
    res.json({ user });
  } catch (e) { next(e); }
});

// DELETE /users/me/banner — remove banner
router.delete('/me/banner', (req: AuthRequest, res, next) => {
  try {
    const user = db.prepare(
      `UPDATE users SET banner_url = NULL, updated_at = unixepoch() WHERE id = ? RETURNING ${PROFILE_FIELDS}`
    ).get(req.userId!) as any;
    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
