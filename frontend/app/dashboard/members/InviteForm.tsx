'use client';

import { useState } from 'react';

type Status = { kind: 'success' | 'error'; text: string } | null;

export default function InviteForm() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('recruiter');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/companies/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (res.ok) {
        setStatus({ kind: 'success', text: 'Invitation sent.' });
        setEmail('');
        return;
      }

      let message = 'Could not send the invitation. Please try again.';
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data.error?.message) message = data.error.message;
      } catch {
        // keep generic message
      }
      setStatus({ kind: 'error', text: message });
    } catch {
      setStatus({ kind: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email to invite"
        className="border rounded px-3 py-1 text-sm bg-transparent w-64"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border rounded px-2 py-1 text-sm bg-transparent"
      >
        <option value="recruiter" className="text-black">Recruiter</option>
        <option value="hr_manager" className="text-black">HR manager</option>
        <option value="hiring_manager" className="text-black">Hiring manager</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Invite'}
      </button>
      {status && (
        <span className={`text-sm ${status.kind === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {status.text}
        </span>
      )}
    </form>
  );
}