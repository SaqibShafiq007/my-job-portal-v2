// frontend/app/dashboard/pipeline/ResumeLink.tsx
'use client';

import { useState } from 'react';
import { extractError } from '@/lib/errors';

export default function ResumeLink({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function openResume() {
    setError('');
    setBusy(true);
    // Open the tab right away so popup blockers allow it, then point it at the signed URL.
    const tab = window.open('', '_blank');
    try {
      const res = await fetch(`/api/companies/applications/${applicationId}/resume`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        tab?.close();
        setError(extractError(data, 'Could not open resume.'));
        return;
      }
      if (tab) tab.location.href = data.url;
      else window.location.href = data.url;
    } catch {
      tab?.close();
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={openResume}
        disabled={busy}
        className="text-sm text-blue-500 underline disabled:opacity-50"
      >
        {busy ? 'Opening...' : 'View resume'}
      </button>
      {error && <span className="text-sm text-red-500">{error}</span>}
    </span>
  );
}