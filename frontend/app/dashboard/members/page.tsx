import { apiFetch } from '@/lib/api';
import InviteForm from './InviteForm';

type Member = {
  recruiterId: string;
  userId: string;
  email: string;
  companyRole: string;
  joinedAt: string;
};

export default async function MembersPage() {
  const res = await apiFetch('/api/companies/members');

  if (!res.ok) {
    let message = 'Could not load members right now. Please try again in a moment.';
    if (res.status === 403) {
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // keep generic message
      }
    }
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Team members</h1>
        <p className="text-sm text-red-500">{message}</p>
      </div>
    );
  }

  const data = (await res.json()) as { members: Member[] };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Team members</h1>

      <InviteForm />

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
                {new Date(m.joinedAt).toLocaleDateString('en-GB')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}