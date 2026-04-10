import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/connection';

interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  status: string;
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)'
  ).run(userId, tokenHash, expiresAt);

  return { accessToken, refreshToken };
}

export function register(username: string, displayName: string, email: string, password: string) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) throw Object.assign(new Error('Email or username already taken'), { status: 409 });

  const passwordHash = bcrypt.hashSync(password, 12);
  const stmt = db.prepare(
    'INSERT INTO users (username, display_name, email, password_hash, badges) VALUES (?, ?, ?, ?, ?) RETURNING id, username, display_name, email, avatar_url, status, verified, badges'
  );
  const user = stmt.get(username, displayName, email, passwordHash, JSON.stringify(['early_access'])) as Omit<User, 'password_hash'>;
  const tokens = generateTokens(user.id);
  return { user, ...tokens };
}

export function login(email: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  db.prepare("UPDATE users SET status = 'online', updated_at = unixepoch() WHERE id = ?").run(user.id);

  const { password_hash, ...safeUser } = user;
  const tokens = generateTokens(user.id);
  return { user: { ...safeUser, status: 'online' }, ...tokens };
}

export function refreshTokens(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > unixepoch()'
  ).get(tokenHash) as { id: string; user_id: string } | undefined;

  if (!stored) throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });

  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

  const user = db.prepare(
    'SELECT id, username, display_name, email, avatar_url, status FROM users WHERE id = ?'
  ).get(stored.user_id) as Omit<User, 'password_hash'> | undefined;

  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });

  const tokens = generateTokens(user.id);
  return { user, ...tokens };
}

export function logout(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
}
