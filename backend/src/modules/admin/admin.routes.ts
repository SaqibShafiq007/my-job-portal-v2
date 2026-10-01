import { Router } from 'express';
import { authMiddleware } from '../../shared/auth-middleware';
import { requireRole } from '../../shared/require-role';
import { NotFoundError } from '../../shared/errors';
import db  from '../../shared/db';
import * as service from './admin.service';

const router = Router();

// Every route on this router requires a valid token with role 'admin'.
router.use(authMiddleware, requireRole('admin'));

// ADMIN EXCEPTION: Admin routes do not scope by company_id.
// Admins have sanctioned cross-company access. The isolation boundary
// here is enforced by requireRole('admin'), not by a company_id filter.
router.get('/jobs/:id', async (req, res, next) => {
  try {
    const result = await db.query<{
      id: string;
      title: string;
      company_id: string;
      status: string;
    }>(
      `SELECT id, title, company_id, status FROM jobs WHERE id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return next(new NotFoundError('Job not found'));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});


// Lists all companies for admin review, optionally filtered by ?status= (verified/suspended/pending).
router.get('/companies', async (req, res, next) => {
  try {
    const companies = await service.listCompanies(req.query.status as string | undefined);
    res.json({ companies });
  } catch (err) {
    next(err);
  }
});

// Marks a company as verified, making its jobs eligible for the public board.
router.patch('/companies/:id/verify', async (req, res, next) => {
  try {
    const company = await service.verifyCompany(req.params.id);
    res.json({ company });
  } catch (err) {
    next(err);
  }
});

// Suspends a company: closes its open jobs and purges the public board cache.
router.patch('/companies/:id/suspend', async (req, res, next) => {
  try {
    const company = await service.suspendCompany(req.params.id);
    res.json({ company });
  } catch (err) {
    next(err);
  }
});

// Lists all jobs across every company, with optional ?status= and ?companyId= filters.
router.get('/jobs', async (req, res, next) => {
  try {
    const jobs = await service.listJobs(
      req.query.status as string | undefined,
      req.query.companyId as string | undefined,
    );
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

// Force-closes any job, regardless of which company owns it.
router.patch('/jobs/:id/close', async (req, res, next) => {
  try {
    const job = await service.forceCloseJob(req.params.id);
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

// Lists all users on the platform, with optional ?role= and ?status= filters.
router.get('/users', async (req, res, next) => {
  try {
    const users = await service.listUsers(
      req.query.role as string | undefined,
      req.query.status as string | undefined,
    );
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Suspends a user's account and invalidates their active sessions.
router.patch('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await service.suspendUser(req.user!.userId, req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// Reactivates a previously suspended user's account.
router.patch('/users/:id/activate', async (req, res, next) => {
  try {
    const user = await service.activateUser(req.params.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };