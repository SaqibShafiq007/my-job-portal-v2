// app/admin/companies/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifyCompany, suspendCompany } from './actions';

type Company = {
  id: string;
  name: string;
  verified: boolean;
  suspended: boolean;
  owner_email: string;
  created_at: string;
};

// Fetches companies from the admin API, optionally filtered by status.
async function fetchCompanies(status?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const url = status
    ? `${process.env.API_URL}/api/admin/companies?status=${status}`
    : `${process.env.API_URL}/api/admin/companies`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return data.companies as Company[];
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const resolvedParams = await searchParams;
  const companies = await fetchCompanies(resolvedParams.status);

  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Companies</h1>
      <div className="flex gap-2 mb-4">
        <Link href="/admin/companies" className="px-3 py-1 border rounded text-sm">All</Link>
        <Link href="/admin/companies?status=pending" className="px-3 py-1 border rounded text-sm">Pending</Link>
        <Link href="/admin/companies?status=verified" className="px-3 py-1 border rounded text-sm">Verified</Link>
        <Link href="/admin/companies?status=suspended" className="px-3 py-1 border rounded text-sm">Suspended</Link>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Verified</th>
            <th className="py-2 pr-4">Suspended</th>
            <th className="py-2 pr-4">Owner</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="py-2 pr-4">{c.name}</td>
              <td className="py-2 pr-4">{c.verified ? 'Yes' : 'No'}</td>
              <td className="py-2 pr-4">{c.suspended ? 'Yes' : 'No'}</td>
              <td className="py-2 pr-4">{c.owner_email ?? '—'}</td>
              <td className="py-2 pr-4">{new Date(c.created_at).toLocaleDateString()}</td>
              <td className="py-2 flex gap-2">
                <form action={verifyCompany}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    disabled={c.verified}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Verify
                  </button>
                </form>
                <form action={suspendCompany}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    disabled={c.suspended}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded disabled:opacity-50"
                  >
                    Suspend
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