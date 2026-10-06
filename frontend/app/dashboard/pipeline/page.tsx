// frontend/app/dashboard/pipeline/page.tsx
import { apiFetch } from '@/lib/api';
import StageActions from './StageActions';
import ScheduleInterview from './ScheduleInterview';

type Interview = {
  id: string;
  scheduled_at: string;
  meeting_link: string | null;
  outcome: string;
};

type PipelineApplication = {
  id: string;
  stage: string;
  created_at: string;
  headline: string | null;
  applicant_id: string;
  job_title: string;
  latest_interview: Interview | null;
};

const STAGES = [
  'applied',
  'screening',
  'interview',
  'final_interview',
  'offer',
  'hired',
  'rejected',
] as const;

export default async function PipelinePage() {
  const res = await apiFetch('/api/companies/applications');

  if (!res.ok) {
    let message = 'Could not load applications right now. Please try again in a moment.';
    if (res.status === 403) {
      try {
        const body = (await res.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // keep the generic message
      }
    }
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-4">Applications Pipeline</h1>
        <p className="text-sm text-red-500">{message}</p>
      </div>
    );
  }

  const data = (await res.json()) as { pipeline: Record<string, PipelineApplication[]> };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Applications Pipeline</h1>

      <div className="space-y-6">
        {STAGES.map((stage) => {
          const items = data.pipeline[stage] ?? [];
          return (
            <section key={stage}>
              <h2 className="text-sm font-semibold uppercase text-gray-400 mb-2">
                {stage.replace('_', ' ')} ({items.length})
              </h2>

              {items.length === 0 ? (
                <p className="text-sm text-gray-500">No applications.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((app) => (
                    <li key={app.id} className="border-b pb-2">
                      <p>{app.job_title}</p>
                      <p className="text-sm text-gray-400">
                        {app.headline ?? 'No headline'} · Applied on{' '}
                        {new Date(app.created_at).toLocaleDateString('en-GB')}
                      </p>
                      {app.latest_interview && (
                        <p className="text-sm">
                          Interview:{' '}
                          {new Date(app.latest_interview.scheduled_at).toLocaleString('en-GB')} (
                          {app.latest_interview.outcome})
                        </p>
                      )}
                      <StageActions applicationId={app.id} currentStage={app.stage} />
                      <ScheduleInterview applicationId={app.id} currentStage={app.stage} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}