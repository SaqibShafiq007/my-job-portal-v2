// frontend/app/dashboard/applications/page.tsx
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Interview = {
  id: string;
  scheduled_at: string;
  meeting_link: string | null;
  notes: string | null;
};

type Application = {
  id: string;
  job_id: string;
  stage: string;
  created_at: string;
  job_title: string;
  company_name: string;
  upcoming_interview: Interview | null;
};

export default async function ApplicationsPage() {
  const res = await apiFetch('/api/applicants/applications');

  if (!res.ok) {
    let message = 'Could not load your applications right now. Please try again in a moment.';
    if (res.status === 404 || res.status === 403) {
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // keep the generic message
      }
    }

    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">My Applications</h1>
        <p className="text-sm text-red-500">{message}</p>
        {res.status === 404 && (
          <Link href="/dashboard/profile" className="text-sm text-blue-600 hover:underline">
            Create your profile
          </Link>
        )}
      </div>
    );
  }

  const data = (await res.json()) as { applications: Application[] };
  const applications = data.applications;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">My Applications</h1>

      {applications.length === 0 ? (
        <p className="text-sm text-gray-400">You have not applied to any jobs yet.</p>
      ) : (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="border-b pb-3">
              <Link href={`/jobs/${app.job_id}`} className="text-blue-600 hover:underline">
                {app.job_title} — {app.company_name}
              </Link>
              <p className="text-sm text-gray-400">
                Stage: {app.stage} · Applied on{' '}
                {new Date(app.created_at).toLocaleDateString('en-GB')}
              </p>

              {app.upcoming_interview && (
                <p className="text-sm mt-1">
                  Interview: {new Date(app.upcoming_interview.scheduled_at).toLocaleString('en-GB')}
                  {app.upcoming_interview.meeting_link && (
                    <>
                      {' '}
                      <a
                        href={app.upcoming_interview.meeting_link}
                        className="text-blue-600 hover:underline"
                      >
                        Meeting link
                      </a>
                    </>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}