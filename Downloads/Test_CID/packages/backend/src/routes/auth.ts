import { Router } from 'express';
import * as authService from '../services/authService';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res, next) => {
  try {
    const { username, display_name, email, password } = req.body;
    if (!username || !display_name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const result = authService.register(username, display_name, email, password);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post('/login', (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    res.json(authService.login(email, password));
  } catch (e) { next(e); }
});

router.post('/refresh', (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
    res.json(authService.refreshTokens(refresh_token));
  } catch (e) { next(e); }
});

router.post('/logout', (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (refresh_token) authService.logout(refresh_token);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ user: req.user });
});

export default router;
