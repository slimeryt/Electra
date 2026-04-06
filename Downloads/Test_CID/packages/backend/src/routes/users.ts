import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();
router.use(requireAuth);

router.get('/:userId', (req: AuthRequest, res, next) => {
  try {
    const user = db.prepare(
      'SELECT id, username, display_name, avatar_url, status FROM users WHERE id = ?'
    ).get(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { next(e); }
});

router.patch('/me', (req: AuthRequest, res, next) => {
  try {
    const { display_name, avatar_url, status } = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];

    if (display_name !== undefined) { fields.push('display_name = ?'); values.push(display_name); }
    if (avatar_url !== undefined)   { fields.push('avatar_url = ?');   values.push(avatar_url); }
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
      `UPDATE users SET ${fields.join(', ')} WHERE id = ? RETURNING id, username, display_name, email, avatar_url, status`
    ).get(...values);

    res.json({ user });
  } catch (e) { next(e); }
});

export default router;
