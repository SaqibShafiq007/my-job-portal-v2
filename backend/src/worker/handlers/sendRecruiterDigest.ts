import db from '../../shared/db';
import logger from '../../shared/logger';
import { sendRecruiterDigestEmail } from '../../shared/mailer';

interface CompanyDigest {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  openJobsCount: number;
  applicationsLast7Days: number;
  interviewsThisWeek: number;
}

// Query aggregate data for all verified, non-suspended companies.
// Uses DISTINCT ON to pick exactly one owner per company (the earliest-assigned
// 'owner' row), since the schema does not enforce a single owner per company.
async function fetchCompanyDigests(): Promise<CompanyDigest[]> {
  const result = await db.query(
    `SELECT DISTINCT ON (c.id)
       c.id             AS "companyId",
       c.name           AS "companyName",
       u.email          AS "ownerEmail",
       (
         SELECT count(*)::int
         FROM jobs j
         WHERE j.company_id = c.id AND j.status = 'open'
       ) AS "openJobsCount",
       (
         SELECT count(*)::int
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.company_id = c.id
           AND a.created_at >= NOW() - INTERVAL '7 days'
       ) AS "applicationsLast7Days",
       (
         SELECT count(*)::int
         FROM interviews iv
         JOIN applications a ON a.id = iv.application_id
         JOIN jobs j ON j.id = a.job_id
         WHERE j.company_id = c.id
           AND iv.scheduled_at >= date_trunc('week', NOW())
           AND iv.scheduled_at <  date_trunc('week', NOW()) + INTERVAL '7 days'
       ) AS "interviewsThisWeek"
     FROM companies c
     JOIN recruiters r ON r.company_id = c.id AND r.company_role = 'owner'
     JOIN users u ON u.id = r.user_id
     WHERE c.verified = true AND c.suspended = false
     ORDER BY c.id, r.created_at ASC`,
    []
  );
  return result.rows;
}

// Send a digest email to each verified company's owner
export async function sendRecruiterDigest(): Promise<void> {
  const digests = await fetchCompanyDigests();

  for (const digest of digests) {
    await sendRecruiterDigestEmail(
      digest.ownerEmail,
      digest.companyName,
      digest.openJobsCount,
      digest.applicationsLast7Days,
      digest.interviewsThisWeek
    );
  }

    logger.info({ companyCount: digests.length }, '[digest] Sent digest emails');
}