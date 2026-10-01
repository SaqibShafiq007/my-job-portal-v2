import db from '../../shared/db';
import { NotFoundError } from '../../shared/errors';
import { v4 as uuid } from 'uuid';
import { CreateJobInput, ListCompanyJobsInput } from './jobs.schema';

// ISOLATION RULE:Every piece of data belongs to someone specific, and the 
// server must only show it to that specific someone — never to anyone else, 
// even if they're a real, logged-in user of the same app. Every company-scoped
//  query must include company_id from
// the authenticated recruiter row (resolved via getRecruiterCompany), never
// from a URL parameter or request body. The recruiter cannot control which
// company_id is used to scope their queries.





/**
 * Asserts that the job identified by jobId belongs to companyId.
 *
 * Throws NotFoundError if:
 *   - No job row exists with that id.
 *   - The job's company_id does not match companyId.
 *
 * Both failure cases return 404, not 403. Returning 404 avoids
 * confirming to the caller that the resource exists — an attacker
 * probing UUIDs learns nothing from the response.
 *
 * companyId must come from getRecruiterCompany(req.user.userId),
 * never from the URL or request body.
 */
export async function assertJobOwnership(
  jobId: string,
  companyId: string,
): Promise<void> {
  const result = await db.query<{ id: string; company_id: string }>(
    `SELECT id, company_id FROM jobs WHERE id = $1`,
    [jobId],
  );

  if (result.rows.length === 0 || result.rows[0].company_id !== companyId) {
    throw new NotFoundError('Job not found');
  }
}






export async function createJob(
  companyId: string,
  input: CreateJobInput,
): Promise<string> {
  const jobId = uuid();
  await db.query(
    `INSERT INTO jobs
       (id, company_id, title, description, status, deadline, attributes, screening_questions, created_at)
     VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, NOW())`,
    [
      jobId,
      companyId,
      input.title,
      input.description,
      input.deadline ?? null,
      JSON.stringify(input.attributes),
      JSON.stringify(input.screening_questions),
    ],
  );
  return jobId;
}

export async function updateJob(
  jobId: string,
  companyId: string,
  input: Partial<CreateJobInput>, // every field optional — this is a PATCH, not a full replace
): Promise<void> {


  const fields: string[] = [];   // will hold pieces like "title = $1"
  const values: unknown[] = [];  // will hold the actual values matching those $1, $2...
  let idx = 1;                   // tracks which $ placeholder number we're on

  // only these columns can ever be updated through this function.
  // Keeps "status" out on purpose — status changes go through setJobStatus instead.
  const allowed = [
    'title', 'description', 'deadline', 'attributes', 'screening_questions',
  ] as const;

  // Loop through only the allowed fields, not the whole input object.
  // This way, even if input somehow had extra junk fields, they're ignored.
  for (const key of allowed) {

    // Check: did the caller actually send this specific field?
    // "key in input" -> does the property exist at all
    // "!== undefined" -> and it wasn't explicitly set to undefined
    if (key in input && input[key as keyof typeof input] !== undefined) {

      // Build the SQL fragment for this field, e.g. "title = $1"
      fields.push(`${key} = $${idx}`);

      // Grab the actual value the caller sent for this field
      const val = input[key as keyof typeof input];

      // JSONB columns (attributes, screening_questions) need to be
      // stringified before Postgres can store them. Everything else
      // (title, description, deadline) goes in as-is.
      values.push(
        key === 'attributes' || key === 'screening_questions'
          ? JSON.stringify(val)
          : val,
      );

      // Move to the next placeholder number for the next field
      idx++;
    }
  }

  // Safety net: if input was empty (or every field was undefined),
  // there's nothing to update — don't run a broken SQL query.
  if (fields.length === 0) return;

  // These go into the WHERE clause, not the SET clause,
  // so they're appended to values AFTER all the SET fields.
  values.push(jobId);
  values.push(companyId);

  // fields.join(', ') turns ["title = $1", "deadline = $2"]
  // into "title = $1, deadline = $2"
  //
  // $${idx} and $${idx + 1} continue the placeholder count right after
  // the SET fields, matching where jobId/companyId landed in `values`.
  //
  // company_id is ALWAYS in the WHERE clause — this is what stops
  // a recruiter from editing a job that belongs to another company.
  await db.query(
    `UPDATE jobs SET ${fields.join(', ')}
     WHERE id = $${idx} AND company_id = $${idx + 1}`,
    values,
  );
}




export async function setJobStatus(
  jobId: string,
  companyId: string,
  status: 'open' | 'closed',
): Promise<void> {
  await db.query(
    `UPDATE jobs SET status = $1
     WHERE id = $2 AND company_id = $3`,
    [status, jobId, companyId],
  );
}

export async function listJobsForCompany(
  companyId: string,
  input: ListCompanyJobsInput,
): Promise<Array<{ id: string; title: string; status: string; createdAt: string }>> {
  const params: unknown[] = [companyId];
  const conditions: string[] = ['company_id = $1'];
  let idx = 2;

  if (input.status) {
    conditions.push(`status = $${idx}`);
    params.push(input.status);
    idx++;
  }

  if (input.cursor) {
    const decoded = decodeCursor(input.cursor);
    if (decoded) {
      conditions.push(`(created_at, id) < ($${idx}::timestamptz, $${idx + 1})`);
      params.push(decoded.createdAt, decoded.id);
      idx += 2;
    }
    // If cursor is malformed, ignore it and return from the start
  }

  params.push(input.limit + 1); // fetch one extra to detect if there is a next page

  const result = await db.query(
    `SELECT id, title, status, created_at AS "createdAt"
     FROM jobs
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC, id DESC
     LIMIT $${idx}`,
    params,
  );

  return result.rows;
}

// Encode: created_at ISO string + '|' + id
export function encodeCursor(createdAt: Date | string, id: string): string {
  const ts = createdAt instanceof Date ? createdAt.toISOString() : createdAt;//Takes the last job's createdAt and id Converts that string into base64url encoding — makes it URL-safe
  return Buffer.from(`${ts}|${id}`).toString('base64url');
}

// Decode: returns { createdAt: string, id: string } or null if invalid
export function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');  //Reverses the encoding: base64url → back to "2026-08-21T10:00:00.000Z|abc-123".
    const pipeIdx = raw.lastIndexOf('|');
    if (pipeIdx === -1) return null;
    return {
      createdAt: raw.slice(0, pipeIdx),
      id: raw.slice(pipeIdx + 1),
    };
  } catch {
    return null;
  }
}


export async function getJobById(
  jobId: string,
  companyId: string,
): Promise<{
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: string | null;
  attributes: Record<string, unknown>;
  screening_questions: unknown[];
  createdAt: string;
} | null> {
  const result = await db.query(
    `SELECT id, title, description, status, deadline, attributes, screening_questions, created_at AS "createdAt"
     FROM jobs
     WHERE id = $1 AND company_id = $2`,
    [jobId, companyId],
  );
  return result.rows[0] ?? null;
}













