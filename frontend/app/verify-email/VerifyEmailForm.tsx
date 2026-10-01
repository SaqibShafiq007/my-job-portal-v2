'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { extractError } from '@/lib/errors';

const RESEND_COOLDOWN = 30; // seconds

export default function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // counts the resend cooldown down once per second
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(extractError(data, 'Verification failed'));
      setLoading(false);
      return;
    }

    router.push('/login');
  }

  async function handleResend() {
    setError('');
    setInfo('');
    if (!email) {
      setError('Enter your email first');
      return;
    }

    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(extractError(data, 'Could not resend code'));
      return;
    }

    setInfo(data.message ?? 'A new code has been sent');
    setCooldown(RESEND_COOLDOWN);
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleVerify} className="w-full max-w-sm space-y-4 p-6 border rounded">
        <h1 className="text-xl font-semibold">Verify your email</h1>
        <p className="text-sm text-gray-600">
          We sent a 6-digit code to your email. Enter it below.
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {info && <p className="text-green-700 text-sm">{info}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="w-full border px-3 py-2 rounded tracking-widest text-center"
          required
        />
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="w-full text-sm text-blue-600 underline disabled:text-gray-400 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </form>
    </div>
  );
}