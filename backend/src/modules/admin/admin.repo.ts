import db from '../../shared/db';

export async function listCompanies(filter?: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter === 'verified') {
    conditions.push(`c.verified = true`);
  } else if (filter === 'suspended') {
    conditions.push(`c.suspended = true`);
  } else if (filter === 'pending') {
    conditions.push(`c.verified = false AND c.suspended = false`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT c.id, c.name, c.verified, c.suspended, c.created_at, u.email AS owner_email
     FROM companies c
     LEFT JOIN recruiters r ON r.company_id = c.id AND r.company_role = 'owner'
     LEFT JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY c.created_at DESC`,
    params,
  );
  return result.rows;
}

export async function findCompanyById(id: string) {
  const result = await db.query(
    `SELECT id, name, verified, suspended FROM companies WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function setCompanyVerified(id: string, verified: boolean) {
  const result = await db.query(
    `UPDATE companies SET verified = $1 WHERE id = $2
     RETURNING id, name, verified, suspended`,
    [verified, id],
  );
  return result.rows[0] ?? null;
}

export async function setCompanySuspended(id: string, suspended: boolean) {
  const result = await db.query(
    `UPDATE companies SET suspended = $1 WHERE id = $2
     RETURNING id, name, verified, suspended`,
    [suspended, id],
  );
  return result.rows[0] ?? null;
}

export async function closeOpenJobsForCompany(companyId: string) {
  await db.query(
    `UPDATE jobs SET status = 'closed'
     WHERE company_id = $1 AND status = 'open'`,
    [companyId],
  );
}

// Lists all jobs across every company, optionally filtered by status or company.
export async function listJobs(status?: string, companyId?: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (status) {
    params.push(status);
    conditions.push(`j.status = $${params.length}`);
  }
  if (companyId) {
    params.push(companyId);
    conditions.push(`j.company_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT j.id, j.title, j.status, j.created_at, c.name AS company_name
     FROM jobs j
     JOIN companies c ON c.id = j.company_id
     ${where}
     ORDER BY j.created_at DESC`,
    params,
  );
  return result.rows;
}

// Finds a single job by ID (used before force-closing).
export async function findJobById(id: string) {
  const result = await db.query(`SELECT id, title, status FROM jobs WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Force-closes a job regardless of which company owns it.
export async function forceCloseJob(id: string) {
  const result = await db.query(
    `UPDATE jobs SET status = 'closed' WHERE id = $1
     RETURNING id, title, status`,
    [id],
  );
  return result.rows[0] ?? null;
}

// Lists all users on the platform, optionally filtered by role or status.
export async function listUsers(role?: string, status?: string) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT id, email, role, status, created_at FROM users ${where} ORDER BY created_at DESC`,
    params,
  );
  return result.rows;
}

// Finds a single user by ID (used before suspend/activate).
export async function findUserById(id: string) {
  const result = await db.query(`SELECT id, email, role, status FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Updates a user's status (active/suspended).
export async function setUserStatus(id: string, status: string) {
  const result = await db.query(
    `UPDATE users SET status = $1 WHERE id = $2
     RETURNING id, email, role, status`,
    [status, id],
  );
  return result.rows[0] ?? null;
}

// Deletes all refresh tokens for a user, forcing their active sessions to log out.
export async function deleteRefreshTokensForUser(userId: string) {
  await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}
