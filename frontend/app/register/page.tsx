'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { extractError } from '@/lib/errors';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'applicant' | 'recruiter'>('applicant');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(extractError(data, 'Registration failed'));
      setLoading(false);
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-xl font-semibold">Create an account</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          {(['applicant', 'recruiter'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`border rounded py-2 text-sm ${
                role === r ? 'bg-blue-600 text-white border-blue-600' : ''
              }`}
            >
              {r === 'applicant' ? 'Job seeker' : 'Recruiter'}
            </button>
          ))}
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          minLength={8}
          maxLength={72}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Register'}
        </button>
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}