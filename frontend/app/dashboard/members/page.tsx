// frontend/app/dashboard/members/page.tsx
import { apiFetch } from '@/lib/api';

type Member = {
  recruiterId: string;
  email: string;
  companyRole: string;
  joinedAt: string;
};

export default async function MembersPage() {
  const res = await apiFetch('/api/companies/members');
  const data: { members: Member[] } = await res.json();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Team members</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Role</th>
            <th className="py-2">Joined</th>
          </tr>
        </thead>
        <tbody>
          {data.members.map((m) => (
            <tr key={m.recruiterId} className="border-b">
              <td className="py-2 pr-4">{m.email}</td>
              <td className="py-2 pr-4 capitalize">{m.companyRole.replace('_', ' ')}</td>
              <td className="py-2 text-gray-500">
                {new Date(m.joinedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}