import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as channelService from '../services/channelService';
import * as messageService from '../services/messageService';
import { getIo } from '../socket/index';

const router = Router();
router.use(requireAuth);

// Channels per server
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

// Messages per channel
router.get('/channels/:channelId/messages', (req: AuthRequest, res, next) => {
  try {
    const { before, limit } = req.query;
    res.json(messageService.getMessages(req.params.channelId, before as string, limit ? parseInt(limit as string) : undefined));
  } catch (e) { next(e); }
});

router.post('/channels/:channelId/messages', (req: AuthRequest, res, next) => {
  try {
    const { content, file_ids } = req.body;
    if (!content && (!file_ids || file_ids.length === 0)) {
      return res.status(400).json({ error: 'content or file_ids required' });
    }
    res.status(201).json(messageService.createMessage(req.params.channelId, req.userId!, content, file_ids || []));
  } catch (e) { next(e); }
});

router.patch('/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const updated = messageService.updateMessage(req.params.messageId, req.userId!, content);
    try {
      const io = getIo();
      io.to(`channel:${updated.channel_id}`).emit('message_update', {
        message_id: updated.id,
        channel_id: updated.channel_id,
        content: updated.content,
        edited_at: updated.edited_at,
      });
    } catch {
      /* socket not initialized (e.g. tests) */
    }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/messages/:messageId', (req: AuthRequest, res, next) => {
  try {
    messageService.deleteMessage(req.params.messageId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
