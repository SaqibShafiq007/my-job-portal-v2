import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Attach a unique request ID to every incoming request
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.id = crypto.randomUUID();
  next();
}