// frontend/app/jobs/[id]/page.tsx
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [status, setStatus] = useState<string | null>(null);

  async function handleApply() {
    const res = await fetch('/api/applicants/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobIds: [jobId], answers: {} }),
    });
    const data = await res.json();
    setStatus(res.ok ? 'Applied!' : data.error?.message ?? 'Error applying');
  }

  async function handleShortlist() {
    const res = await fetch('/api/applicants/shortlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    const data = await res.json();
    setStatus(res.ok ? 'Shortlisted!' : data.error?.message ?? 'Already shortlisted or error');
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Job {jobId}</h1>
      <div className="flex gap-2">
        <button onClick={handleApply} className="bg-blue-600 text-white px-4 py-2 rounded">
          Apply
        </button>
        <button onClick={handleShortlist} className="bg-gray-600 text-white px-4 py-2 rounded">
          Shortlist
        </button>
      </div>
      {status && <p className="mt-4 text-sm">{status}</p>}
    </main>
  );
}