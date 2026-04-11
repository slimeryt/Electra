import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as channelService from '../services/channelService';
import * as categoryService from '../services/categoryService';
import * as messageService from '../services/messageService';
import * as forumService from '../services/forumService';
import * as channelReadService from '../services/channelReadService';
import * as reportService from '../services/reportService';
import { getIo } from '../socket/index';
import { httpError } from '../utils/httpError';
import db from '../db/connection';

const router = Router();
router.use(requireAuth);

const MAX_MESSAGES_QUERY_LIMIT = 100;

function parseLimit(raw: unknown, max: number, defaultVal: number): number {
  if (raw === undefined || raw === '' || raw === null) return defaultVal;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1) {
    throw httpError('Invalid limit', 400, 'INVALID_PAGINATION');
  }
  if (n > max) {
    throw httpError(`Limit must be at most ${max}`, 400, 'INVALID_PAGINATION');
  }
  return n;
}

// ─── Categories ──────────────────────────────────────────────────────────────
router.get('/servers/:serverId/categories', (req: AuthRequest, res, next) => {
  try { res.json(categoryService.getCategories(req.params.serverId)); } catch (e) { next(e); }
});

router.post('/servers/:serverId/categories', (req: AuthRequest, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    res.status(201).json(categoryService.createCategory(req.params.serverId, req.userId!, name));
  } catch (e) { next(e); }
});

router.patch('/servers/:serverId/categories/:catId', (req: AuthRequest, res, next) => {
  try {
    res.json(categoryService.updateCategory(req.params.serverId, req.params.catId, req.userId!, req.body));
  } catch (e) { next(e); }
});

router.delete('/servers/:serverId/categories/:catId', (req: AuthRequest, res, next) => {
  try {
    categoryService.deleteCategory(req.params.serverId, req.params.catId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Channels ─────────────────────────────────────────────────────────────────
router.get('/servers/:serverId/channels', (req: AuthRequest, res, next) => {
  try {
    res.json(channelService.getChannels(req.params.serverId));
  } catch (e) { next(e); }
});

router.post('/servers/:serverId/channels', (req: AuthRequest, res, next) => {
  try {
    const { name, type, category, position } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    res.status(201).json(channelService.createChannel(req.params.serverId, req.userId!, name, type, category, position));
  } catch (e) { next(e); }
});

router.patch('/channels/:channelId', (req: AuthRequest, res, next) => {
  try {
    res.json(channelService.updateChannel(req.params.channelId, req.userId!, req.body));
  } catch (e) { next(e); }
});

router.delete('/channels/:channelId', (req: AuthRequest, res, next) => {
  try {
    channelService.deleteChannel(req.params.channelId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/mark-read', (req: AuthRequest, res, next) => {
  try {
    res.json(channelReadService.markChannelRead(req.params.channelId, req.userId!));
  } catch (e) { next(e); }
});

// Forum thread messages (before single-post and list routes)
router.get('/channels/:channelId/forum/posts/:postId/messages', (req: AuthRequest, res, next) => {
  try {
    forumService.assertForumChannel(req.params.channelId);
    forumService.assertPostInChannel(req.params.postId, req.params.channelId);
    const limit = parseLimit(req.query.limit, MAX_MESSAGES_QUERY_LIMIT, 50);
    const before = req.query.before as string | undefined;
    res.json(
      messageService.getMessages(req.params.channelId, before, limit, req.params.postId, req.userId!),
    );
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/forum/posts/:postId/messages', (req: AuthRequest, res, next) => {
  try {
    forumService.assertForumChannel(req.params.channelId);
    forumService.assertPostInChannel(req.params.postId, req.params.channelId);
    const { content, file_ids } = req.body;
    if (!content && (!file_ids || file_ids.length === 0)) {
      return res.status(400).json({ error: 'content or file_ids required', code: 'CONTENT_REQUIRED' });
    }
    res.status(201).json(
      messageService.createMessage(
        req.params.channelId,
        req.userId!,
        content,
        file_ids || [],
        req.body.reply_to_id,
        req.params.postId,
      ),
    );
  } catch (e) { next(e); }
});

router.get('/channels/:channelId/forum/posts/:postId', (req: AuthRequest, res, next) => {
  try {
    const post = forumService.getPostInChannel(req.params.channelId, req.params.postId, req.userId!);
    res.json(post);
  } catch (e) { next(e); }
});

router.patch('/channels/:channelId/forum/posts/:postId', (req: AuthRequest, res, next) => {
  try {
    const { title, body } = req.body;
    const post = forumService.updatePostInChannel(
      req.params.channelId,
      req.params.postId,
      req.userId!,
      title,
      body,
    );
    try {
      const io = getIo();
      const cid = req.params.channelId;
      io.to(`channel:${cid}`).emit('forum_post_update', { channel_id: cid, post });
      io.to(`forum_post:${req.params.postId}`).emit('forum_post_update', { channel_id: cid, post });
    } catch { /* no socket */ }
    res.json(post);
  } catch (e) { next(e); }
});

router.delete('/channels/:channelId/forum/posts/:postId', (req: AuthRequest, res, next) => {
  try {
    const postId = req.params.postId;
    forumService.deletePostInChannel(req.params.channelId, postId, req.userId!);
    try {
      const io = getIo();
      const cid = req.params.channelId;
      io.to(`channel:${cid}`).emit('forum_post_delete', { channel_id: cid, post_id: postId });
      io.to(`forum_post:${postId}`).emit('forum_post_delete', { channel_id: cid, post_id: postId });
    } catch { /* no socket */ }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/channels/:channelId/forum/posts', (req: AuthRequest, res, next) => {
  try {
    const { before } = req.query;
    const limit = parseLimit(req.query.limit, forumService.MAX_FORUM_POSTS_PAGE, 30);
    res.json(
      forumService.listPosts(
        req.params.channelId,
        req.userId!,
        before as string | undefined,
        limit,
      ),
    );
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/forum/posts', (req: AuthRequest, res, next) => {
  try {
    const { title, body } = req.body;
    const post = forumService.createPost(req.params.channelId, req.userId!, title, body);
    try {
      const io = getIo();
      io.to(`channel:${req.params.channelId}`).emit('forum_post_create', { channel_id: req.params.channelId, post });
    } catch { /* no socket */ }
    res.status(201).json(post);
  } catch (e) { next(e); }
});

// Messages per channel
router.get('/channels/:channelId/messages', (req: AuthRequest, res, next) => {
  try {
    const { before, forum_post_id } = req.query;
    const limit = parseLimit(req.query.limit, MAX_MESSAGES_QUERY_LIMIT, 50);
    const ch = db.prepare('SELECT type FROM channels WHERE id = ?').get(req.params.channelId) as { type: string } | undefined;
    if (!ch) throw httpError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
    if (ch.type === 'forum' && !forum_post_id) {
      throw httpError('forum_post_id query parameter required for forum channels', 400, 'FORUM_POST_ID_REQUIRED');
    }
    if (ch.type !== 'forum' && forum_post_id) {
      throw httpError('forum_post_id is only valid for forum channels', 400, 'FORUM_POST_INVALID');
    }
    res.json(
      messageService.getMessages(
        req.params.channelId,
        before as string,
        limit,
        (forum_post_id as string) || null,
        req.userId!,
      ),
    );
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/messages', (req: AuthRequest, res, next) => {
  try {
    const { content, file_ids, forum_post_id } = req.body;
    if (!content && (!file_ids || file_ids.length === 0)) {
      return res.status(400).json({ error: 'content or file_ids required', code: 'CONTENT_REQUIRED' });
    }
    res.status(201).json(
      messageService.createMessage(
        req.params.channelId,
        req.userId!,
        content,
        file_ids || [],
        req.body.reply_to_id,
        forum_post_id || null,
      ),
    );
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/messages/:messageId/report', (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    res.status(201).json(
      reportService.reportChannelMessage(req.userId!, req.params.channelId, req.params.messageId, reason),
    );
  } catch (e) { next(e); }
});

router.patch('/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const updated = messageService.updateMessage(req.params.messageId, req.userId!, content);
    try {
      const io = getIo();
      const payload = {
        message_id: updated.id,
        channel_id: updated.channel_id,
        content: updated.content,
        edited_at: updated.edited_at,
        forum_post_id: (updated as { forum_post_id?: string | null }).forum_post_id ?? null,
      };
      if ((updated as { forum_post_id?: string | null }).forum_post_id) {
        io.to(`forum_post:${(updated as { forum_post_id: string }).forum_post_id}`).emit('message_update', payload);
      } else {
        io.to(`channel:${updated.channel_id}`).emit('message_update', payload);
      }
    } catch {
      /* socket not initialized (e.g. tests) */
    }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    const meta = db.prepare('SELECT id, channel_id, forum_post_id FROM messages WHERE id = ?').get(req.params.messageId) as
      | { id: string; channel_id: string; forum_post_id: string | null }
      | undefined;
    messageService.deleteMessage(req.params.messageId, req.userId!);
    if (meta) {
      try {
        const io = getIo();
        const payload = { message_id: meta.id, channel_id: meta.channel_id, forum_post_id: meta.forum_post_id };
        if (meta.forum_post_id) io.to(`forum_post:${meta.forum_post_id}`).emit('message_delete', payload);
        else io.to(`channel:${meta.channel_id}`).emit('message_delete', payload);
      } catch { /* no socket */ }
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
