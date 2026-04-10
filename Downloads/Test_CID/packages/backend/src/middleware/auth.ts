import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/connection';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string; username: string; display_name: string; email: string;
    avatar_url: string | null; banner_url: string | null; status: string;
    custom_status: string | null; bio: string | null;
    accent_color: string | null; username_font: string | null;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const user = db.prepare(
      'SELECT id, username, display_name, email, avatar_url, banner_url, status, custom_status, bio, accent_color, username_font FROM users WHERE id = ?'
    ).get(payload.userId) as AuthRequest['user'];

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
