/*
What requireRole actually does — the core idea
Think about the difference between these two questions:

"Is this a real, logged-in user?" ← authMiddleware already answers this
"Is this specific logged-in user ALLOWED to do this specific thing?" ← this is new — requireRole answers this

Example: imagine an endpoint like "delete a job posting." You want:

Recruiters → allowed
Applicants → NOT allowed, even though they're logged in fine

*/


import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './errors';

export function requireRole(
  ...roles: ('admin' | 'recruiter' | 'applicant')[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient role'));
    }
    next();
  };
}