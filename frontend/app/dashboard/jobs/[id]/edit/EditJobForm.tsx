'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  jobId: string;
  initialTitle: string;
  initialDescription: string;
  initialDeadline: string;
};

export default function EditJobForm({
  jobId,
  initialTitle,
  initialDescription,
  initialDeadline,
}: Props) {
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
      title: (form.get('title') as string).trim(),
      description: (form.get('description') as string).trim(),
      ...(deadline ? { deadline } : {}),
    };

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push(`/dashboard/jobs/${jobId}`);
        router.refresh();
        return;
      }

      let message = 'Could not save changes. Please try again.';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Title *</label>
        <input
          name="title"
          required
          defaultValue={initialTitle}
          className="w-full border rounded px-3 py-2 text-sm bg-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description *</label>
        <textarea
          name="description"
          required
          rows={8}
          defaultValue={initialDescription}
          className="w-full border rounded px-3 py-2 text-sm bg-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Deadline</label>
        <input
          type="date"
          name="deadline"
          defaultValue={initialDeadline}
          className="w-full border rounded px-3 py-2 text-sm bg-transparent"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
}