import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import db from '../db/connection';
import { getIo } from '../socket/index';

const router = Router();
router.use(requireAuth);

router.get('/', (req: AuthRequest, res, next) => {
  try {
    const dms = db.prepare(`
      SELECT dm.*,
        json_group_array(json_object('id', u.id, 'username', u.username, 'display_name', u.display_name, 'avatar_url', u.avatar_url, 'status', u.status)) as participants
      FROM direct_messages dm
      JOIN dm_participants dp ON dp.dm_id = dm.id
      JOIN dm_participants dp2 ON dp2.dm_id = dm.id AND dp2.user_id != ?
      JOIN users u ON u.id = dp2.user_id
      WHERE dp.user_id = ?
      GROUP BY dm.id
      ORDER BY dm.created_at DESC
    `).all(req.userId, req.userId);

    res.json(dms.map((dm: any) => ({
      ...dm,
      participants: JSON.parse(dm.participants),
    })));
  } catch (e) { next(e); }
});

router.post('/', (req: AuthRequest, res, next) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (user_id === req.userId) return res.status(400).json({ error: 'Cannot DM yourself' });

    // Check if DM already exists between these two users
    const existing = db.prepare(`
      SELECT dm.id FROM direct_messages dm
      JOIN dm_participants dp1 ON dp1.dm_id = dm.id AND dp1.user_id = ?
      JOIN dm_participants dp2 ON dp2.dm_id = dm.id AND dp2.user_id = ?
    `).get(req.userId, user_id) as { id: string } | undefined;

    if (existing) return res.json({ id: existing.id });

    const dm = db.transaction(() => {
      const newDm = db.prepare('INSERT INTO direct_messages DEFAULT VALUES RETURNING *').get() as { id: string };
      db.prepare('INSERT INTO dm_participants (dm_id, user_id) VALUES (?, ?)').run(newDm.id, req.userId);
      db.prepare('INSERT INTO dm_participants (dm_id, user_id) VALUES (?, ?)').run(newDm.id, user_id);
      return newDm;
    })();

    res.status(201).json(dm);
  } catch (e) { next(e); }
});

router.get('/:dmId/messages', (req: AuthRequest, res, next) => {
  try {
    // Verify access
    const access = db.prepare(
      'SELECT 1 FROM dm_participants WHERE dm_id = ? AND user_id = ?'
    ).get(req.params.dmId, req.userId);
    if (!access) return res.status(403).json({ error: 'Forbidden' });

    const { before, limit = '50' } = req.query;
    let query = 'SELECT * FROM dm_messages WHERE dm_id = ?';
    const params: unknown[] = [req.params.dmId];

    if (before) {
      const ref = db.prepare('SELECT created_at FROM dm_messages WHERE id = ?').get(before as string) as { created_at: number } | undefined;
      if (ref) { query += ' AND created_at < ?'; params.push(ref.created_at); }
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Math.min(parseInt(limit as string), 100));

    const messages = (db.prepare(query).all(...params) as any[]).map(msg => {
      const author = db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(msg.author_id);
      const attachments = db.prepare(`SELECT f.* FROM dm_attachments a JOIN files f ON f.id = a.file_id WHERE a.message_id = ?`).all(msg.id);
      return { ...msg, author, attachments };
    });

    res.json(messages.reverse());
  } catch (e) { next(e); }
});

router.post('/:dmId/messages', (req: AuthRequest, res, next) => {
  try {
    const access = db.prepare('SELECT 1 FROM dm_participants WHERE dm_id = ? AND user_id = ?').get(req.params.dmId, req.userId);
    if (!access) return res.status(403).json({ error: 'Forbidden' });

    const { content, file_ids = [] } = req.body;
    if (!content && file_ids.length === 0) return res.status(400).json({ error: 'content or file_ids required' });

    const msg = db.transaction(() => {
      const m = db.prepare(
        'INSERT INTO dm_messages (dm_id, author_id, content, type) VALUES (?, ?, ?, ?) RETURNING *'
      ).get(req.params.dmId, req.userId, content || null, file_ids.length > 0 ? 'file' : 'text') as any;

      for (const fileId of file_ids) {
        db.prepare('INSERT INTO dm_attachments (message_id, file_id) VALUES (?, ?)').run(m.id, fileId);
      }

      const author = db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(req.userId);
      const attachments = db.prepare(`SELECT f.* FROM dm_attachments a JOIN files f ON f.id = a.file_id WHERE a.message_id = ?`).all(m.id);
      return { ...m, author, attachments };
    })();

    res.status(201).json(msg);
  } catch (e) { next(e); }
});

router.patch('/:dmId/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const msg = db.prepare('SELECT * FROM dm_messages WHERE id = ? AND dm_id = ?').get(req.params.messageId, req.params.dmId) as any;
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.author_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const updated = db.prepare('UPDATE dm_messages SET content = ?, edited_at = unixepoch() WHERE id = ? RETURNING *').get(content, req.params.messageId) as any;
    const author = db.prepare('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?').get(updated.author_id);
    try {
      const io = getIo();
      io.to(`dm:${req.params.dmId}`).emit('dm_message_update', {
        dm_id: req.params.dmId,
        message_id: updated.id,
        content: updated.content,
        edited_at: updated.edited_at,
      });
    } catch {
      /* socket not ready */
    }
    res.json({ ...updated, author });
  } catch (e) { next(e); }
});

router.delete('/:dmId/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    const msg = db.prepare('SELECT * FROM dm_messages WHERE id = ? AND dm_id = ?').get(req.params.messageId, req.params.dmId) as any;
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    if (msg.author_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM dm_messages WHERE id = ?').run(req.params.messageId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
