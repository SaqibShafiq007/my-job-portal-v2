// app/admin/users/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { suspendUser, activateUser } from './actions';

type User = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

// Fetches users from the admin API, optionally filtered by role or status.
async function fetchUsers(role?: string, status?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const res = await fetch(`${process.env.API_URL}/api/admin/users${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return data.users as User[];
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const users = await fetchUsers(resolvedParams.role, resolvedParams.status);

  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Users</h1>
      <div className="flex gap-2 mb-4">
        <Link href="/admin/users" className="px-3 py-1 border rounded text-sm">All</Link>
        <Link href="/admin/users?role=recruiter" className="px-3 py-1 border rounded text-sm">Recruiters</Link>
        <Link href="/admin/users?role=applicant" className="px-3 py-1 border rounded text-sm">Applicants</Link>
        <Link href="/admin/users?status=suspended" className="px-3 py-1 border rounded text-sm">Suspended</Link>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="py-2 pr-4">{u.email}</td>
              <td className="py-2 pr-4 capitalize">{u.role}</td>
              <td className="py-2 pr-4">{u.status}</td>
              <td className="py-2 pr-4">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="py-2 flex gap-2">
                <form action={suspendUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button
                    type="submit"
                    disabled={u.status === 'suspended'}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Suspend
                  </button>
                </form>
                <form action={activateUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button
                    type="submit"
                    disabled={u.status === 'active'}
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Activate
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}