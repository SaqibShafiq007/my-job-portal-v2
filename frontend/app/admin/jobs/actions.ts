// app/admin/jobs/actions.ts
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Server Action bound to the "Close" button — force-closes a job as admin.
export async function closeJob(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const id = formData.get('id') as string;

    const res = await fetch(`${process.env.API_URL}/api/admin/jobs/${id}/close`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Job close failed (${res.status})`);

  revalidatePath('/admin/jobs');
}