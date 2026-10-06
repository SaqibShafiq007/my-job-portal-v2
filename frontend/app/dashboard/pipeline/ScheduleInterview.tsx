// frontend/app/dashboard/pipeline/ScheduleInterview.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TERMINAL = ['hired', 'rejected'];

export default function ScheduleInterview({
  applicationId,
  currentStage,
}: {
  applicationId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (TERMINAL.includes(currentStage)) return null;

  async function handleSubmit() {
    setError(null);

    if (!scheduledAt || !meetingLink.trim()) {
      setError('Date/time and meeting link are required.');
      return;
    }

    setLoading(true);
    try {
      const body: { scheduledAt: string; meetingLink: string; notes?: string } = {
        scheduledAt: new Date(scheduledAt).toISOString(),
        meetingLink: meetingLink.trim(),
      };
      if (notes.trim()) body.notes = notes.trim();

      const res = await fetch(`/api/companies/applications/${applicationId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setOpen(false);
        setScheduledAt('');
        setMeetingLink('');
        setNotes('');
        router.refresh();
        return;
      }

      let message = 'Could not schedule the interview. Please try again.';
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        Schedule interview
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 border rounded p-3 max-w-md">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Date and time</label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-transparent w-full"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Meeting link</label>
        <input
          type="url"
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
          className="border rounded px-2 py-1 text-sm bg-transparent w-full"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="border rounded px-2 py-1 text-sm bg-transparent w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Scheduling...' : 'Schedule'}
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