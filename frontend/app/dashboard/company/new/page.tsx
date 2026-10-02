// frontend/app/dashboard/company/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractError } from '@/lib/errors';

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body: { name: string; website?: string; description?: string } = {
      name: name.trim(),
    };
    if (website.trim()) body.website = website.trim();
    if (description.trim()) body.description = description.trim();

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(extractError(data, 'Could not create company'));
      setLoading(false);
      return;
    }

    router.push('/dashboard/jobs');
    router.refresh();
  }

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">Create your company</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <input
          type="text"
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          minLength={2}
          maxLength={100}
          required
        />
        <input
          type="url"
          placeholder="Website (optional), e.g. https://example.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          rows={4}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create company'}
        </button>
      </form>
    </div>
  );
}