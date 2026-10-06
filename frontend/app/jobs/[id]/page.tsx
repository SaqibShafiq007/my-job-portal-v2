// frontend/app/jobs/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import ApplyActions from './ApplyActions';

type JobDetail = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  deadline: string | null;
  createdAt: string;
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/api/public/jobs/${id}`);

  if (res.status === 404) notFound();

  if (!res.ok) {
    return (
      <main className="p-6">
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          ← Back to jobs
        </Link>
        <p className="mt-4 text-sm text-red-500">
          Could not load this job right now. Please try again in a moment.
        </p>
      </main>
    );
  }

  const job = (await res.json()) as JobDetail;

  return (
    <main className="p-6 max-w-2xl">
      <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
        ← Back to jobs
      </Link>

      <h1 className="text-2xl font-semibold mt-4">{job.title}</h1>
      <p className="text-gray-400 mb-4">{job.companyName}</p>

      <p className="whitespace-pre-wrap mb-4">{job.description}</p>

      {job.deadline && (
        <p className="text-sm text-gray-400 mb-4">
          Deadline: {new Date(job.deadline).toLocaleDateString('en-GB')}
        </p>
      )}

      <ApplyActions jobId={job.id} />
    </main>
  );
}