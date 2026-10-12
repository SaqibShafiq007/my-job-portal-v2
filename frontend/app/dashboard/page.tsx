import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { decodeRole } from '@/lib/auth';

// /dashboard has no page of its own: send each role to its starting page.
// This is navigation only; every destination still checks access itself.
export default async function DashboardEntry() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) redirect('/login');

  const role = decodeRole(token);
  if (role === 'applicant') redirect('/dashboard/shortlist');
  if (role === 'admin') redirect('/admin/companies');
  if (role === 'recruiter') redirect('/dashboard/jobs');

  redirect('/login');
}