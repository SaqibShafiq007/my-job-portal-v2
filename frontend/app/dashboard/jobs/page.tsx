// frontend/app/dashboard/jobs/page.tsx
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Job = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  const resolvedParams = await searchParams;

  const params = new URLSearchParams();
  if (resolvedParams.status) params.set('status', resolvedParams.status);
  if (resolvedParams.cursor) params.set('cursor', resolvedParams.cursor);
  params.set('limit', '20');

  const res = await apiFetch(`/api/jobs?${params.toString()}`);
  const data: { jobs: Job[]; nextCursor: string | null } = await res.json();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Link href="/dashboard/jobs/new" className="bg-blue-600 text-white px-4 py-2 rounded">
          Post a job
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'open', 'closed'].map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/dashboard/jobs' : `/dashboard/jobs?status=${s}`}
            className="px-3 py-1 border rounded text-sm"
          >
            {s}
          </Link>
        ))}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.jobs.map((job) => (
            <tr key={job.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4">
                <Link href={`/dashboard/jobs/${job.id}`} className="text-blue-600 hover:underline">
                  {job.title}
                </Link>
              </td>
              <td className="py-2 pr-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  job.status === 'open' ? 'bg-green-100 text-green-800' :
                  job.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                  'bg-red-100 text-red-700'
                }`}>
                  {job.status}
                </span>
              </td>
              <td className="py-2 text-gray-500">
                {new Date(job.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.nextCursor && (
        <div className="mt-4">
          <Link
            href={`/dashboard/jobs?${params.toString()}&cursor=${data.nextCursor}`}
            className="text-blue-600 text-sm hover:underline"
          >
            Next page →
          </Link>
        </div>
      )}
    </div>
  );
}