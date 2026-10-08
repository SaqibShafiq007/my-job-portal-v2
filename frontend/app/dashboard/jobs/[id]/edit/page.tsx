import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import EditJobForm from './EditJobForm';

type Job = {
  id: string;
  title: string;
  description: string;
  status: string;
  deadline: string | null;
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/api/jobs/${id}`);

  if (!res.ok) {
    const message =
      res.status === 404
        ? 'Job not found.'
        : 'Could not load this job right now. Please try again in a moment.';
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
    <div className="p-6 max-w-xl">
      <Link href={`/dashboard/jobs/${id}`} className="text-sm text-blue-600 hover:underline">
        ← Back to job
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-6">Edit job</h1>
      <EditJobForm
        jobId={id}
        initialTitle={job.title}
        initialDescription={job.description}
        initialDeadline={job.deadline ? job.deadline.slice(0, 10) : ''}
      />
    </div>
  );
}