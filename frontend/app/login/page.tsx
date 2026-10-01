// frontend/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || 'Login failed');
      setLoading(false);
      return;
    }

    const data = await res.json();
    if (data.role === 'applicant') {
      router.push('/dashboard/shortlist');
    } else if (data.role === 'admin') {
      router.push('/admin/companies');
    } else {
      router.push('/dashboard/jobs');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-xl font-semibold">Log in</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {error === 'Email not verified' && (
          <Link
            href={`/verify-email?email=${encodeURIComponent(email)}`}
            className="text-blue-600 underline text-sm"
          >
            Verify your email
          </Link>
        )}
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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}