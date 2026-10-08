// frontend/app/dashboard/jobs/[id]/page.tsx
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import JobActions from './JobActions';

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/api/jobs/${id}`);

  if (!res.ok) {
    let message = 'Could not load this job right now. Please try again in a moment.';
    if (res.status === 404) {
      message = 'Job not found.';
    } else if (res.status === 403) {
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // keep generic message
      }
    }
    return (
      <div className="p-6">
        <Link href="/dashboard/jobs" className="text-sm text-blue-600 hover:underline">
          ← Back to jobs
        </Link>
        <p className="mt-4 text-sm text-red-500">{message}</p>
      </div>
    );
  }

  const job = (await res.json()) as Job;

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/dashboard/jobs" className="text-sm text-blue-600 hover:underline">
        ← Back to jobs
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-2">{job.title}</h1>
      <span className="text-sm text-gray-500 capitalize">{job.status}</span>
      <p className="mt-4 text-sm whitespace-pre-wrap">{job.description}</p>
      <div className="mt-6">
        <JobActions jobId={id} currentStatus={job.status} />
      </div>
    </div>
  );
}