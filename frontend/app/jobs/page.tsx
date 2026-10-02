// frontend/app/jobs/page.tsx
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  companyName: string;
  createdAt: string;
};

type JobsResponse = { jobs: Job[]; nextCursor: string | null };

// Fetches one page of public jobs. Returns null if the backend call fails.
async function fetchJobs(q?: string, cursor?: string): Promise<JobsResponse | null> {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();

  const res = await apiFetch(qs ? `/api/public/jobs?${qs}` : '/api/public/jobs');
  if (!res.ok) return null;
  return (await res.json()) as JobsResponse;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const { q, cursor } = await searchParams;
  const data = await fetchJobs(q, cursor);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Open Positions</h1>

      <form action="/jobs" method="get" className="flex gap-2 mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search jobs..."
          className="border rounded px-3 py-1 text-sm flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
        >
          Search
        </button>
        {q && (
          <Link href="/jobs" className="text-sm px-3 py-1 border rounded">
            Clear
          </Link>
        )}
      </form>

      {!data ? (
        <p className="text-sm text-red-500">
          Could not load jobs right now. Please try again in a moment.
        </p>
      ) : data.jobs.length === 0 ? (
        <p className="text-sm text-gray-400">
          {q ? `No jobs match "${q}".` : 'No open positions found.'}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {data.jobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:underline">
                  {job.title} — {job.companyName}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex gap-4 mt-6 text-sm">
            {cursor && (
              <Link
                href={q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs'}
                className="px-3 py-1 border rounded"
              >
                First page
              </Link>
            )}
            {data.nextCursor && (
              <Link
                href={`/jobs?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  cursor: data.nextCursor,
                }).toString()}`}
                className="px-3 py-1 border rounded"
              >
                Next page
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  );
}