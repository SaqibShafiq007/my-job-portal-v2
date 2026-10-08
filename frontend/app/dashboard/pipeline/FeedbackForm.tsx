'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedbackForm({ interviewId }: { interviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [outcome, setOutcome] = useState<'moved_forward' | 'rejected'>('moved_forward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!feedback.trim()) {
      setError('Feedback is required.');
      return;
    }
    if (outcome === 'rejected' && !window.confirm('Reject this applicant? This cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/interviews/${interviewId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim(), outcome }),
      });

      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }

      let message = 'Could not save feedback. Please try again.';
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

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-sm text-blue-600 hover:underline">
        Give interview feedback
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 border rounded p-3 max-w-md">
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={3}
        placeholder="Interview feedback"
        className="border rounded px-2 py-1 text-sm bg-transparent w-full"
      />
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as 'moved_forward' | 'rejected')}
        className="border rounded px-2 py-1 text-sm bg-transparent"
      >
        <option value="moved_forward" className="text-black">Move forward</option>
        <option value="rejected" className="text-black">Reject</option>
      </select>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save feedback'}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="text-sm text-gray-400 hover:underline"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}