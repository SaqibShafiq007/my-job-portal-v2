// frontend/app/dashboard/jobs/[id]/page.tsx
import { apiFetch } from '@/lib/api';
import JobActions from './JobActions';

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch(`/api/jobs/${id}`);
  if (!res.ok) return <p className="p-6 text-red-600">Job not found.</p>;
  const job = await res.json();

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">{job.title}</h1>
      <span className="text-sm text-gray-500 capitalize">{job.status}</span>
      <p className="mt-4 text-sm whitespace-pre-wrap">{job.description}</p>
      <div className="mt-6">
        <JobActions jobId={id} currentStatus={job.status} />
      </div>
    </div>
  );
}