// frontend/app/dashboard/LogoutButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="block text-sm text-gray-500 hover:text-red-600 disabled:opacity-50"
    >
      {busy ? 'Logging out...' : 'Log out'}
    </button>
  );
}