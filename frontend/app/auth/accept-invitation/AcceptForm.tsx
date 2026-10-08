'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: { token: string; email: string; password?: string } = {
        token,
        email: email.trim(),
      };
      if (password) body.password = password;

      const res = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = (await res.json()) as { role?: string | null };
        router.push(data.role === 'recruiter' ? '/dashboard/jobs' : '/');
        router.refresh();
        return;
      }

      let message = 'Could not accept the invitation. Please try again.';
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Invited email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded px-3 py-1 text-sm bg-transparent w-full"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Password (only if you do not have an account yet, min 8 characters)
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded px-3 py-1 text-sm bg-transparent w-full"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Accepting...' : 'Accept invitation'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}