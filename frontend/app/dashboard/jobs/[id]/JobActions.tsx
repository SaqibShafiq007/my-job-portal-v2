// frontend/app/dashboard/jobs/[id]/JobActions.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function JobActions({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  async function callAction(action: 'publish' | 'close') {
    await fetch(`/api/jobs/${jobId}/${action}`, { method: 'POST' });
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {currentStatus === 'draft' && (
        <button
          onClick={() => callAction('publish')}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          Publish
        </button>
      )}
      {currentStatus === 'open' && (
        <button
          onClick={() => callAction('close')}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm"
        >
          Close
        </button>
      )}
    </div>
  );
}