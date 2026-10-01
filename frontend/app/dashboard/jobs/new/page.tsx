// frontend/app/dashboard/jobs/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewJobPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const deadline = form.get('deadline') as string;

    const body = {
      title: form.get('title') as string,
      description: form.get('description') as string,
      ...(deadline ? { deadline } : {}),
    };

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const { jobId } = await res.json();
      router.push(`/dashboard/jobs/${jobId}`);
    } else {
      const data = await res.json();
      setError(data.error?.message ?? 'Something went wrong.');
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Post a job</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input name="title" required className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea name="description" required rows={5} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Deadline</label>
          <input type="date" name="deadline" className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save as draft'}
        </button>
      </form>
    </div>
  );
}