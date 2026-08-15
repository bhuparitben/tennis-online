import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    // No `maxAge`/`expires`: a session cookie, cleared when the browser closes.
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
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
