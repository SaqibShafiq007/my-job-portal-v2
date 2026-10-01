// app/admin/layout.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Decodes the JWT payload to read the role claim, without needing a /me endpoint.
function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

// Verifies the user is an admin before rendering any admin page.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) redirect('/login');

  const role = decodeRole(token);
  if (role !== 'admin') redirect('/');

  return (
    <div className="flex min-h-screen">
      <nav className="w-48 border-r p-4 space-y-2">
        <p className="text-xs font-semibold uppercase text-gray-400 mb-3">Admin</p>
        <Link href="/admin/companies" className="block text-sm hover:text-blue-600">
          Companies
        </Link>
        <Link href="/admin/jobs" className="block text-sm hover:text-blue-600">
          Jobs
        </Link>
        <Link href="/admin/users" className="block text-sm hover:text-blue-600">
          Users
        </Link>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}