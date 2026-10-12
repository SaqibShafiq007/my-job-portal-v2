import { requireRole } from '@/lib/auth';

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  await requireRole('recruiter');
  return <>{children}</>;
}