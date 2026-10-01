// frontend/app/jobs/page.tsx
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

type Job = {
  id: string;
  title: string;
  companyName: string;
  createdAt: string;
};

export default async function JobsPage() {
  const res = await apiFetch('/api/public/jobs');
  const data: { jobs: Job[]; nextCursor: string | null } = await res.json();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Open Positions</h1>
      <ul className="space-y-2">
        {data.jobs.map((job) => (
          <li key={job.id}>
            <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:underline">
              {job.title} — {job.companyName}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}