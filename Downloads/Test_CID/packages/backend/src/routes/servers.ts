import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as serverService from '../services/serverService';
import * as roleService from '../services/roleService';
import * as botService from '../services/botService';
import db from '../db/connection';
import { imageUpload } from '../middleware/upload';
import { getIo } from '../socket/index';

// One-time migration: add is_public column
try { db.exec('ALTER TABLE servers ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0'); } catch { /* exists */ }
try { db.exec('ALTER TABLE servers ADD COLUMN banner_url TEXT'); } catch { /* exists */ }

const router = Router();

// Public discovery (no auth required)
router.get('/discover', (req, res, next) => {
  try {
    res.json(serverService.getPublicServers(req.query.q as string | undefined));
  } catch (e) { next(e); }
});

router.use(requireAuth);

router.get('/', (req: AuthRequest, res, next) => {
  try {
    res.json(serverService.getUserServers(req.userId!));
  } catch (e) { next(e); }
});

router.post('/', (req: AuthRequest, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    res.status(201).json(serverService.createServer(name, description, req.userId!));
  } catch (e) { next(e); }
});

router.get('/:serverId', (req: AuthRequest, res, next) => {
  try {
    res.json(serverService.getServer(req.params.serverId, req.userId!));
  } catch (e) { next(e); }
});

router.patch('/:serverId', (req: AuthRequest, res, next) => {
  try {
    res.json(serverService.updateServer(req.params.serverId, req.userId!, req.body));
  } catch (e) { next(e); }
});

// POST /servers/:serverId/icon — upload server icon, store as data URI
router.post('/:serverId/icon', imageUpload.single('icon'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const iconUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const updated = db.prepare(
      'UPDATE servers SET icon_url = ? WHERE id = ? RETURNING *'
    ).get(iconUrl, req.params.serverId);

    res.json(updated);
  } catch (e) { next(e); }
});

// POST /servers/:serverId/banner — upload server banner, store as data URI
router.post('/:serverId/banner', imageUpload.single('banner'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const bannerUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const updated = db.prepare(
      'UPDATE servers SET banner_url = ? WHERE id = ? RETURNING *'
    ).get(bannerUrl, req.params.serverId);

    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:serverId', (req: AuthRequest, res, next) => {
  try {
    serverService.deleteServer(req.params.serverId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/:serverId/members', (req: AuthRequest, res, next) => {
  try {
    res.json(serverService.getServerMembers(req.params.serverId));
  } catch (e) { next(e); }
});

router.post('/join', (req: AuthRequest, res, next) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) return res.status(400).json({ error: 'invite_code required' });
    const server = serverService.joinServer(invite_code, req.userId!);
    // Trigger welcome + auto-role bots after join
    try { botService.handleMemberJoin(getIo(), (server as any).id, req.userId!); } catch {}
    res.json(server);
  } catch (e) { next(e); }
});

router.delete('/:serverId/members/me', (req: AuthRequest, res, next) => {
  try {
    serverService.leaveServer(req.params.serverId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:serverId/members/:userId', (req: AuthRequest, res, next) => {
  try {
    serverService.kickMember(req.params.serverId, req.params.userId, req.userId!);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Roles ────────────────────────────────────────────────────────────────────

router.get('/:serverId/roles', (req: AuthRequest, res, next) => {
  try { res.json(roleService.getRoles(req.params.serverId)); } catch (e) { next(e); }
});

router.post('/:serverId/roles', (req: AuthRequest, res, next) => {
  try {
    const { name, color, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    res.status(201).json(roleService.createRole(req.params.serverId, req.userId!, { name, color, permissions }));
  } catch (e) { next(e); }
});

router.patch('/:serverId/roles/:roleId', (req: AuthRequest, res, next) => {
  try { res.json(roleService.updateRole(req.params.roleId, req.userId!, req.body)); } catch (e) { next(e); }
});

router.delete('/:serverId/roles/:roleId', (req: AuthRequest, res, next) => {
  try { res.json(roleService.deleteRole(req.params.roleId, req.userId!)); } catch (e) { next(e); }
});

// Assign / remove role from member
router.post('/:serverId/members/:targetUserId/roles/:roleId', (req: AuthRequest, res, next) => {
  try {
    res.json(roleService.assignRole(req.params.serverId, req.params.roleId, req.params.targetUserId, req.userId!));
  } catch (e) { next(e); }
});

router.delete('/:serverId/members/:targetUserId/roles/:roleId', (req: AuthRequest, res, next) => {
  try {
    res.json(roleService.removeRole(req.params.serverId, req.params.roleId, req.params.targetUserId, req.userId!));
  } catch (e) { next(e); }
});

// ─── Bot config routes ────────────────────────────────────────────────────────
function requireAdminOrOwner(req: AuthRequest, res: any, next: any) {
  const member = db.prepare('SELECT role FROM server_members WHERE server_id = ? AND user_id = ?').get(req.params.serverId, req.userId!) as { role: string } | undefined;
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
  next();
}

router.get('/:serverId/bots', requireAdminOrOwner, (req: AuthRequest, res, next) => {
  try {
    res.json(botService.getBotConfigs(req.params.serverId));
  } catch (e) { next(e); }
});

router.put('/:serverId/bots/:type', requireAdminOrOwner, (req: AuthRequest, res, next) => {
  try {
    const { enabled, config } = req.body;
    botService.setBotConfig(req.params.serverId, req.params.type as botService.BotType, !!enabled, config || {});
    res.json(botService.getBotConfigs(req.params.serverId));
  } catch (e) { next(e); }
});

export default router;
