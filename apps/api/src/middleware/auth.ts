import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export interface JwtPayload {
  id: number;
  role: 'admin' | 'ambassador';
  email: string;
}

// Extend Express Request to carry the decoded token
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_in_prod';

/**
 * The session lives in an HttpOnly cookie, never in a JS-readable token, so
 * XSS can't exfiltrate it. It carries no Max-Age — the browser drops it the
 * moment the whole browser process closes, but keeps it alive across new
 * tabs/reloads for as long as the browser stays open. The JWT's own `exp`
 * (JWT_EXPIRES_IN) is the backstop for browsers whose "restore previous
 * session" feature resurrects session cookies after a restart.
 */
export const AUTH_COOKIE = 'tot_session';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  } as jwt.SignOptions);
}

// Frontend (Vercel) and backend (Render) sit on different domains in
// production, so the session cookie has to be sent cross-site — that only
// works with SameSite=None, which browsers refuse to honor without Secure.
// In dev, frontend and backend are same-origin (via Vite's proxy), so Lax
// over plain http still works and doesn't need Secure.
const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  // No `maxAge`/`expires`: a session cookie, cleared when the browser closes.
  res.cookie(AUTH_COOKIE, token, COOKIE_OPTS);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, COOKIE_OPTS);
}

/** Require a valid session cookie — attaches req.user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) {
    res.status(401).json({ error: 'No session' });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/** Require a specific role after requireAuth */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden — insufficient role' });
      return;
    }
    next();
  };
}

/**
 * Gates write actions on an ambassador's *current* status — the JWT payload
 * only carries id/role/email, so a rejected or blocked ambassador with an
 * already-issued, still-valid session cookie could otherwise keep adding,
 * editing, or deleting data through these routes. Rejected/blocked accounts
 * are allowed to log in and browse read-only (per the ambassador-facing
 * banner), but every mutating route must reject them here regardless of
 * what the UI shows. Admins are untouched — this only checks when the
 * caller's role is 'ambassador'.
 */
export async function requireActiveAmbassador(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || req.user.role !== 'ambassador') { next(); return; }

  try {
    const amb = await prisma.ambassador.findUnique({
      where: { id: req.user.id },
      select: { status: true, reject_reason: true },
    });
    if (!amb) {
      res.status(401).json({ error: 'Session invalid' });
      return;
    }
    if (amb.status === 'approved') { next(); return; }

    const messages: Record<string, string> = {
      rejected: amb.reject_reason
        ? `บัญชีของคุณถูกปฏิเสธ — เหตุผล: ${amb.reject_reason}`
        : 'บัญชีของคุณถูกปฏิเสธ ไม่สามารถทำรายการนี้ได้',
      blocked: 'บัญชีของคุณถูกระงับการใช้งานชั่วคราว กรุณาติดต่อทีมงาน',
      pending: 'บัญชียังไม่ได้รับการอนุมัติ ยังไม่สามารถทำรายการนี้ได้',
    };
    res.status(403).json({ error: messages[amb.status] ?? 'ไม่มีสิทธิ์ทำรายการนี้', status: amb.status });
  } catch {
    res.status(500).json({ error: 'ตรวจสอบสิทธิ์ไม่สำเร็จ' });
  }
}
