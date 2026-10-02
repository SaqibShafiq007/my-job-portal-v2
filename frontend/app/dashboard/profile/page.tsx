// frontend/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import ProfileForm from './ProfileForm';
import ResumeUpload from './ResumeUpload';

type Profile = {
  full_name: string;
  headline: string | null;
  location: string | null;
};

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export default async function ProfilePage() {
  const res = await apiFetch('/api/applicants/profile');

  if (res.status === 401) redirect('/login');

  // 404 = no profile yet, show the create form
  if (res.status === 404) {
    return (
      <main className="p-6 max-w-xl">
        <h1 className="text-2xl font-semibold mb-2">Create your profile</h1>
        <p className="text-sm text-gray-600 mb-4">
          You need a profile before you can apply for jobs.
        </p>
        <ProfileForm
          exists={false}
          initial={{ full_name: '', headline: '', location: '' }}
        />
      </main>
    );
  }

  if (!res.ok) {
    return (
      <main className="p-6 max-w-xl">
        <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
        <p className="text-sm text-red-600">{await readError(res)}</p>
      </main>
    );
  }

  const body = await res.json();
  const profile: Profile = body?.data ?? body;

  return (
    <main className="p-6 max-w-xl space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-4">Edit your profile</h1>
        <ProfileForm
          exists={true}
          initial={{
            full_name: profile.full_name ?? '',
            headline: profile.headline ?? '',
            location: profile.location ?? '',
          }}
        />
      </section>
      <section>
        <ResumeUpload />
      </section>
    </main>
  );
}