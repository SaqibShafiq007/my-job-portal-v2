'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractError } from '@/lib/errors';

type Values = { full_name: string; headline: string; location: string };

export default function ProfileForm({
  exists,
  initial,
}: {
  exists: boolean;
  initial: Values;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(field: keyof Values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch('/api/applicants/profile', {
        method: exists ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name.trim(),
          headline: values.headline.trim() || undefined,
          location: values.location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(extractError(data, 'Could not save your profile.'));
        return;
      }
      if (exists) {
        setSaved(true);
        router.refresh();
      } else {
        router.push('/dashboard/shortlist');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full rounded border border-gray-300 px-3 py-2';

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Full name</span>
        <input
          className={input}
          required
          value={values.full_name}
          onChange={(e) => update('full_name', e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Headline</span>
        <input
          className={input}
          placeholder="e.g. Frontend developer"
          value={values.headline}
          onChange={(e) => update('headline', e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Location</span>
        <input
          className={input}
          placeholder="e.g. Lahore, Pakistan"
          value={values.location}
          onChange={(e) => update('location', e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Profile saved.</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? 'Saving...' : exists ? 'Save changes' : 'Create profile'}
      </button>
    </form>
  );
}