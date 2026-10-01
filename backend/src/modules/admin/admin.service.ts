import * as repo from './admin.repo';
import redis from '../../shared/redis';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors';

export async function listCompanies(filter?: string) {
  return repo.listCompanies(filter);
}

export async function verifyCompany(id: string) {
  const company = await repo.findCompanyById(id);
  if (!company) throw new NotFoundError('Company not found');
  if (company.verified) throw new ConflictError('Company is already verified');

  return repo.setCompanyVerified(id, true);
}

export async function suspendCompany(id: string) {
  const company = await repo.findCompanyById(id);
  if (!company) throw new NotFoundError('Company not found');
  if (company.suspended) throw new ConflictError('Company is already suspended');

  const updated = await repo.setCompanySuspended(id, true);

  await repo.closeOpenJobsForCompany(id);

  await redis.del('jobs:public:page1');

  return updated;
}

// Returns all jobs across the platform, optionally filtered.
export async function listJobs(status?: string, companyId?: string) {
  return repo.listJobs(status, companyId);
}

// Force-closes a job regardless of company ownership; rejects if already closed.
export async function forceCloseJob(id: string) {
  const job = await repo.findJobById(id);
  if (!job) throw new NotFoundError('Job not found');
  if (job.status === 'closed') throw new ConflictError('Job is already closed');
  return repo.forceCloseJob(id);
}

// Returns all users on the platform, optionally filtered by role/status.
export async function listUsers(role?: string, status?: string) {
  return repo.listUsers(role, status);
}

// Suspends a user and invalidates their active sessions; admins cannot suspend themselves.
export async function suspendUser(adminId: string, userId: string) {
  if (adminId === userId) {
    throw new ForbiddenError('Admins cannot suspend themselves');
  }

  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.status === 'suspended') throw new ConflictError('User is already suspended');

  const updated = await repo.setUserStatus(userId, 'suspended');
  await repo.deleteRefreshTokensForUser(userId);

  return updated;
}

// Reactivates a previously suspended user.
export async function activateUser(userId: string) {
  const user = await repo.findUserById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.status === 'active') throw new ConflictError('User is already active');
  return repo.setUserStatus(userId, 'active');
}