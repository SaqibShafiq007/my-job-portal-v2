// frontend/app/dashboard/layout.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) redirect('/login');

  const role = decodeRole(token);

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 border-r p-4 space-y-2">
        {role === 'recruiter' && (
          <>
            <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Company</p>
            <Link href="/dashboard/jobs" className="block text-sm hover:text-blue-600">
              Jobs
            </Link>
            <Link href="/dashboard/members" className="block text-sm hover:text-blue-600">
              Members
            </Link>
          </>
        )}
        {role === 'applicant' && (
          <>
            <p className="text-xs font-semibold uppercase text-gray-400 mb-3">My Account</p>
            <Link href="/dashboard/shortlist" className="block text-sm hover:text-blue-600">
              Shortlist
            </Link>
            <Link href="/dashboard/applications" className="block text-sm hover:text-blue-600">
              Applications
            </Link>
            <Link href="/dashboard/profile" className="block text-sm hover:text-blue-600">
              Profile
            </Link>
          </>
        )}
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}