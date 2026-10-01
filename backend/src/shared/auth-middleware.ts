// src/shared/auth-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './token';
import { UnauthorizedError } from './errors';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.slice(7); // remove "Bearer " prefix (7 chars)

  if (!token) {
    // Header was exactly "Bearer " with nothing after — token is absent.
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}