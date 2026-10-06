// frontend/app/jobs/[id]/ApplyActions.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

type Status = { kind: 'success' | 'error'; text: string } | null;

type ApiBody = {
  error?: { message?: string };
  skipped?: string[];
} | null;


async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorText(status: number, data: ApiBody): string {
  if (status === 401) return 'Please log in as an applicant first.';
  if (status === 403) return 'Only applicant accounts can apply or shortlist jobs.';
  return data?.error?.message ?? 'Something went wrong. Please try again.';
}

export default function ApplyActions({ jobId }: { jobId: string }) {
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/applicants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds: [jobId], answers: {} }),
      });
      const data = await readJson(res);

      if (!res.ok) {
        setStatus({ kind: 'error', text: errorText(res.status, data) });
      } else if (data?.skipped?.includes(jobId)) {
        setStatus({ kind: 'error', text: 'You have already applied to this job.' });
      } else {
        setStatus({ kind: 'success', text: 'Application submitted!' });
      }
    } catch {
      setStatus({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleShortlist() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/applicants/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await readJson(res);

      if (!res.ok) {
        setStatus({ kind: 'error', text: errorText(res.status, data) });
      } else {
        setStatus({ kind: 'success', text: 'Added to your shortlist.' });
      }
    } catch {
      setStatus({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Apply
        </button>
        <button
          onClick={handleShortlist}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Shortlist
        </button>
      </div>

      {status && (
        <p
          className={`mt-4 text-sm ${
            status.kind === 'success' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {status.text}
        </p>
      )}

      {status?.kind === 'error' && status.text.includes('Profile not found') && (
        <Link href="/dashboard/profile" className="text-sm text-blue-600 hover:underline">
          Create your profile
        </Link>
      )}
      {status?.kind === 'error' && status.text.includes('log in') && (
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Go to login
        </Link>
      )}
    </div>
  );
}