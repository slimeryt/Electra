import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import * as friendService from '../services/friendService';
import { emitFriendEvent } from '../socket/handlers/friends';
import { getIo } from '../socket/index';
import db from '../db/connection';

const router = Router();
router.use(requireAuth);

// GET /friends — list all accepted friends
router.get('/', (req: AuthRequest, res, next) => {
  try { res.json(friendService.getFriends(req.userId!)); } catch (e) { next(e); }
});

// GET /friends/blocked — users you blocked
router.get('/blocked', (req: AuthRequest, res, next) => {
  try { res.json(friendService.getBlockedUsers(req.userId!)); } catch (e) { next(e); }
});

// GET /friends/requests — incoming + outgoing pending requests
router.get('/requests', (req: AuthRequest, res, next) => {
  try { res.json(friendService.getPendingRequests(req.userId!)); } catch (e) { next(e); }
});

// POST /friends — send friend request by username
router.post('/', (req: AuthRequest, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    const result = friendService.sendRequest(req.userId!, username) as any;
    res.status(201).json(result);

    // Notify target user via socket
    try {
      const io = getIo();
      const targetId = result.target_id || result.addressee_id;
      if (targetId) {
        // Build a friend request payload for the target
        const sender = db.prepare('SELECT id, username, display_name, avatar_url, status FROM users WHERE id = ?').get(req.userId!) as any;
        if (sender) {
          emitFriendEvent(io, targetId, 'friend_request', {
            id: result.id,
            status: result.status,
            direction: 'incoming',
            created_at: result.created_at,
            user: { id: sender.id, username: sender.username, display_name: sender.display_name, avatar_url: sender.avatar_url, status: sender.status },
          });
        }
      }
    } catch {}
  } catch (e) { next(e); }
});

// POST /friends/:friendshipId/accept
router.post('/:friendshipId/accept', (req: AuthRequest, res, next) => {
  try {
    const result = friendService.acceptRequest(req.userId!, req.params.friendshipId) as any;
    res.json(result);

    // Notify requester that their request was accepted
    try {
      const io = getIo();
      const acceptor = db.prepare('SELECT id, username, display_name, avatar_url, status FROM users WHERE id = ?').get(req.userId!) as any;
      if (acceptor && result.requester_id) {
        emitFriendEvent(io, result.requester_id, 'friend_accepted', {
          friendship_id: req.params.friendshipId,
          user: { id: acceptor.id, username: acceptor.username, display_name: acceptor.display_name, avatar_url: acceptor.avatar_url, status: acceptor.status },
        });
      }
    } catch {}
  } catch (e) { next(e); }
});

// POST /friends/:friendshipId/decline (or cancel)
router.post('/:friendshipId/decline', (req: AuthRequest, res, next) => {
  try { res.json(friendService.declineRequest(req.userId!, req.params.friendshipId)); } catch (e) { next(e); }
});

// DELETE /friends/:targetUserId — remove accepted friend
router.delete('/:targetUserId', (req: AuthRequest, res, next) => {
  try {
    // Find the friendship id before deleting
    const friendship = db.prepare(
      'SELECT id FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = \'accepted\''
    ).get(req.userId!, req.params.targetUserId, req.params.targetUserId, req.userId!) as any;

    res.json(friendService.removeFriend(req.userId!, req.params.targetUserId));

    // Notify the removed friend
    try {
      const io = getIo();
      if (friendship) {
        emitFriendEvent(io, req.params.targetUserId, 'friend_removed', { friendship_id: friendship.id });
      }
    } catch {}
  } catch (e) { next(e); }
});

// POST /friends/:targetUserId/block
router.post('/:targetUserId/block', (req: AuthRequest, res, next) => {
  try { res.json(friendService.blockUser(req.userId!, req.params.targetUserId)); } catch (e) { next(e); }
});

export default router;
