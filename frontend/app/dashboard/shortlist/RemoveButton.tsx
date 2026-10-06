// frontend/app/dashboard/shortlist/RemoveButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RemoveButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/applicants/shortlist/${jobId}`, { method: 'DELETE' });

      if (res.status === 204) {
        router.refresh();
        return;
      }

      let message = 'Could not remove this job. Please try again.';
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // keep the generic message
      }
      setError(message);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="ml-3">
      <button
        onClick={handleRemove}
        disabled={loading}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        {loading ? 'Removing...' : 'Remove'}
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </span>
  );
}