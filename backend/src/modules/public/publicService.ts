// backend/src/modules/public/publicService.ts
import db from '../../shared/db';
import { NotFoundError } from '../../shared/errors';
import redis from '../../shared/redis';
import { config } from '../../shared/config';

const PUBLIC_PAGE1_KEY = 'jobs:public:page1';

interface PublicJobsQuery {
  q?: string;
  cursor?: string;
  limit: number;
}

interface CursorData {
  createdAt: string;
  id: string;
}

function decodeCursor(cursor: string): CursorData | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const pipe = raw.lastIndexOf('|');
    if (pipe === -1) return null;
    return { createdAt: raw.slice(0, pipe), id: raw.slice(pipe + 1) };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: Date, id: string): string {
  const raw = `${createdAt.toISOString()}|${id}`;
  return Buffer.from(raw).toString('base64url');
}

export async function getPublicJobs(query: PublicJobsQuery) {
  const { q, cursor, limit } = query;

  // Cache-aside: only cache the unfiltered first page
  const isFirstPage = !cursor;
  const hasFilters = !!q;
  const useCached = isFirstPage && !hasFilters && limit === 20;

  if (useCached) {
    const cached = await redis.get(PUBLIC_PAGE1_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // --- DB query (same as ch39/ch43, with full-text search) ---
  const params: unknown[] = [];
  const conditions: string[] = [`j.status = 'open'`, `c.verified = true`];

  if (q) {
    params.push(q);
    conditions.push(
      `j.search_vector @@ plainto_tsquery('english', $${params.length})`
    );
  }

  const decoded = cursor ? decodeCursor(cursor) : null;
  if (decoded) {
    params.push(decoded.createdAt, decoded.id);
    conditions.push(
      `(j.created_at, j.id) < ($${params.length - 1}::timestamptz, $${params.length})`
    );
  }

  const whereClause = conditions.join(' AND ');
  params.push(limit + 1);
  const limitParam = params.length;

  const sql = `
    SELECT j.id, j.title, j.created_at, c.name AS company_name
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE ${whereClause}
    ORDER BY j.created_at DESC, j.id DESC
    LIMIT $${limitParam}
  `;

  const { rows } = await db.query(sql, params);

  const hasNextPage = rows.length > limit;
  const jobs = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage
    ? encodeCursor(jobs[jobs.length - 1].created_at, jobs[jobs.length - 1].id)
    : null;

  const result = {
    jobs: jobs.map((r) => ({
      id: r.id,
      title: r.title,
      companyName: r.company_name,
      createdAt: r.created_at,
    })),
    nextCursor,
  };

  // Store in Redis if this was the cacheable request
    if (useCached) {
    await redis.set(PUBLIC_PAGE1_KEY, JSON.stringify(result), {
      EX: config.CACHE_TTL_SECONDS,
    });
  }

  return result;
}

export async function getPublicJobById(id: string) {
  const sql = `
    SELECT j.id, j.title, j.description, j.deadline, j.attributes,
           j.screening_questions, j.created_at, c.name AS company_name
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE j.id = $1 AND j.status = 'open' AND c.verified = true
  `;
  const { rows } = await db.query(sql, [id]);
  if (rows.length === 0) throw new NotFoundError('Job not found.');

  const r = rows[0];
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    companyName: r.company_name,
    deadline: r.deadline,
    attributes: r.attributes,
    screeningQuestions: r.screening_questions,
    createdAt: r.created_at,
  };
}