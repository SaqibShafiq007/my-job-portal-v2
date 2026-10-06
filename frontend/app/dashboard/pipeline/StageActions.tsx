// frontend/app/dashboard/pipeline/StageActions.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  'applied',
  'screening',
  'interview',
  'final_interview',
  'offer',
  'hired',
  'rejected',
] as const;

const TERMINAL = ['hired', 'rejected'];

export default function StageActions({
  applicationId,
  currentStage,
}: {
  applicationId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentIdx = STAGES.indexOf(currentStage as (typeof STAGES)[number]);
  const nextStages = STAGES.filter((s, i) => i > currentIdx && s !== 'rejected');
  const [target, setTarget] = useState<string>(nextStages[0] ?? '');

  if (TERMINAL.includes(currentStage)) return null;

  async function moveTo(stage: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/applications/${applicationId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });

      if (res.ok) {
        router.refresh();
        return;
      }

      let message = 'Could not change the stage. Please try again.';
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

  function handleReject() {
    if (window.confirm('Reject this application? This cannot be undone.')) {
      moveTo('rejected');
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {nextStages.length > 0 && (
        <>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={loading}
            className="border rounded px-2 py-1 text-sm bg-transparent"
          >
            {nextStages.map((s) => (
              <option key={s} value={s} className="text-black">
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <button
            onClick={() => moveTo(target)}
            disabled={loading || !target}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Move
          </button>
        </>
      )}
      <button
        onClick={handleReject}
        disabled={loading}
        className="text-sm text-red-500 hover:underline disabled:opacity-50"
      >
        Reject
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}