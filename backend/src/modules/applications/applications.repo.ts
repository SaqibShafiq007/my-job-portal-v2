import db from '../../shared/db';

export async function findApplicationForCompany(
  applicationId: string,
  companyId: string,
) {
  const result = await db.query(
    `SELECT a.id, a.job_id, a.applicant_id, a.stage, a.created_at, a.updated_at
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1 AND j.company_id = $2`,
    [applicationId, companyId],
  );
  return result.rows[0] ?? null;
}

export async function updateApplicationStage(applicationId: string, stage: string) {
  const result = await db.query(
    `UPDATE applications SET stage = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, job_id, applicant_id, stage, created_at, updated_at`,
    [stage, applicationId],
  );
  return result.rows[0] ?? null;
}

export async function findApplicationWithApplicant(
  applicationId: string,
  companyId: string,
) {
  const result = await db.query(
    `SELECT
       a.id, a.job_id, a.applicant_id, a.stage,
       u.email AS applicant_email,
       j.title AS job_title
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     JOIN applicants ap ON ap.id = a.applicant_id
     JOIN users u ON u.id = ap.user_id
     WHERE a.id = $1 AND j.company_id = $2`,
    [applicationId, companyId],
  );
  return result.rows[0] ?? null;
}

export async function createInterview(
  applicationId: string,
  scheduledAt: Date,
  meetingLink: string,
  notes: string | null,
) {
  const result = await db.query(
    `INSERT INTO interviews (application_id, scheduled_at, meeting_link, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING id, application_id, scheduled_at, meeting_link, notes, outcome, created_at`,
    [applicationId, scheduledAt, meetingLink, notes],
  );
  return result.rows[0];
}

export async function findInterviewForCompany(
  interviewId: string,
  companyId: string,
) {
  const result = await db.query(
    `SELECT
       i.id, i.application_id, i.scheduled_at, i.meeting_link,
       i.notes, i.feedback, i.outcome,
       a.stage AS application_stage,
       j.company_id
     FROM interviews i
     JOIN applications a ON a.id = i.application_id
     JOIN jobs         j ON j.id = a.job_id
     WHERE i.id = $1 AND j.company_id = $2`,
    [interviewId, companyId],
  );
  return result.rows[0] ?? null;
}

export async function updateInterviewFeedback(
  interviewId: string,
  feedback: string,
  outcome: 'moved_forward' | 'rejected',
) {
  const result = await db.query(
    `UPDATE interviews
     SET feedback = $1, outcome = $2
     WHERE id = $3
     RETURNING id, application_id, scheduled_at, meeting_link, notes, feedback, outcome, created_at`,
    [feedback, outcome, interviewId],
  );
  return result.rows[0] ?? null;
}

export async function findApplicationsForCompany(companyId: string) {
  const result = await db.query(
    `SELECT
       a.id,
       a.stage,
       a.created_at,
       a.profile_snapshot->>'headline' AS headline,
       a.applicant_id,
       j.title AS job_title,
       (
         SELECT row_to_json(i_sub)
         FROM (
           SELECT id, scheduled_at, meeting_link, outcome
           FROM interviews
           WHERE application_id = a.id
           ORDER BY created_at DESC
           LIMIT 1
         ) i_sub
       ) AS latest_interview
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE j.company_id = $1
     ORDER BY a.stage, a.created_at DESC`,
    [companyId],
  );
  return result.rows;
}