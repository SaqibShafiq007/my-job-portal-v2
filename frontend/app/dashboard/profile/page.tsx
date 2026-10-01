// frontend/app/dashboard/profile/page.tsx
import { apiFetch } from '@/lib/api';
import ResumeUpload from './ResumeUpload';

type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  headline: string | null;
  location: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
};

export default async function ProfilePage() {
  const res = await apiFetch('/api/applicants/profile');
  const profile: Profile = await res.json();

  return (
    <main className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
      <div className="space-y-2 text-sm">
        <p><span className="font-medium">Name:</span> {profile.full_name}</p>
        <p><span className="font-medium">Headline:</span> {profile.headline ?? '—'}</p>
        <p><span className="font-medium">Location:</span> {profile.location ?? '—'}</p>
        <p><span className="font-medium">Attributes:</span> {JSON.stringify(profile.attributes)}</p>
      </div>
      <ResumeUpload />
    </main>
  );
}