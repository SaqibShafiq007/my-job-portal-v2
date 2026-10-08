// frontend/app/dashboard/jobs/[id]/JobActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JobActions({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callAction(action: 'publish' | 'close') {
    if (action === 'close' && !window.confirm('Close this job? Applicants will no longer see it.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/${action}`, { method: 'POST' });

      if (res.ok) {
        router.refresh();
        return;
      }

      let message = `Could not ${action} this job. Please try again.`;
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
      } catch {
        // keep generic message
      }
      setError(message);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        {currentStatus === 'draft' && (
          <button
            onClick={() => callAction('publish')}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish'}
          </button>
        )}
        {currentStatus === 'open' && (
          <button
            onClick={() => callAction('close')}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? 'Closing...' : 'Close'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}