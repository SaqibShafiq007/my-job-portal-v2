// app/admin/jobs/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { closeJob } from './actions';

type Job = {
  id: string;
  title: string;
  status: string;
  company_name: string;
  created_at: string;
};

// Fetches jobs from the admin API, optionally filtered by status.
async function fetchJobs(status?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${process.env.API_URL}/api/admin/jobs${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return data.jobs as Job[];
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const jobs = await fetchJobs(resolvedParams.status);

  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Jobs</h1>
      <div className="flex gap-2 mb-4">
        <Link href="/admin/jobs" className="px-3 py-1 border rounded text-sm">All</Link>
        <Link href="/admin/jobs?status=open" className="px-3 py-1 border rounded text-sm">Open</Link>
        <Link href="/admin/jobs?status=closed" className="px-3 py-1 border rounded text-sm">Closed</Link>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Company</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b">
              <td className="py-2 pr-4">{j.title}</td>
              <td className="py-2 pr-4">{j.company_name}</td>
              <td className="py-2 pr-4">{j.status}</td>
              <td className="py-2 pr-4">{new Date(j.created_at).toLocaleDateString()}</td>
              <td className="py-2">
                <form action={closeJob}>
                  <input type="hidden" name="id" value={j.id} />
                  <button
                    type="submit"
                    disabled={j.status === 'closed'}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Close
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}