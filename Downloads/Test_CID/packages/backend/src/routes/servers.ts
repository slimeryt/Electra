import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as serverService from '../services/serverService';
import * as roleService from '../services/roleService';
import db from '../db/connection';
import { upload } from '../middleware/upload';

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

// POST /servers/:serverId/icon — upload server icon image
router.post('/:serverId/icon', upload.single('icon'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Only images allowed' });

    const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const iconUrl = `${backendUrl}/uploads/${req.file.filename}`;

    const updated = db.prepare(
      'UPDATE servers SET icon_url = ? WHERE id = ? RETURNING *'
    ).get(iconUrl, req.params.serverId);

    res.json(updated);
  } catch (e) { next(e); }
});

// POST /servers/:serverId/banner — upload server banner image
router.post('/:serverId/banner', upload.single('banner'), (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'Only images allowed' });

    const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) return res.status(404).json({ error: 'Server not found' });
    if (server.owner_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const bannerUrl = `${backendUrl}/uploads/${req.file.filename}`;

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
    res.json(serverService.joinServer(invite_code, req.userId!));
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

export default router;
