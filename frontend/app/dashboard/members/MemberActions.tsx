'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  recruiterId: string;
  currentRole: string;
  isOwner: boolean;
};

export default function MemberActions({ recruiterId, currentRole, isOwner }: Props) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function readError(res: Response, fallback: string) {
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      return data.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function changeRole(newRole: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/members/${recruiterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        setError(await readError(res, 'Could not change the role.'));
        return;
      }
      setRole(newRole);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('Remove this member from the company?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/members/${recruiterId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError(await readError(res, 'Could not remove the member.'));
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isOwner && (
        <select
          value={role}
          disabled={loading}
          onChange={(e) => changeRole(e.target.value)}
          className="border rounded px-2 py-1 text-sm bg-transparent disabled:opacity-50"
        >
          <option value="recruiter" className="text-black">Recruiter</option>
          <option value="hr_manager" className="text-black">HR manager</option>
          <option value="hiring_manager" className="text-black">Hiring manager</option>
        </select>
      )}
      <button
        type="button"
        onClick={remove}
        disabled={loading}
        className="text-red-500 text-sm border border-red-500 rounded px-2 py-1 disabled:opacity-50"
      >
        Remove
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}