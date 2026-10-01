// app/admin/companies/actions.ts
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Sends a verify or suspend PATCH request to the admin API for a given company.
async function patchCompany(id: string, action: 'verify' | 'suspend') {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  await fetch(`${process.env.API_URL}/api/admin/companies/${id}/${action}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath('/admin/companies');
}

// Server Action bound to the "Verify" button — marks a company as verified.
export async function verifyCompany(formData: FormData) {
  await patchCompany(formData.get('id') as string, 'verify');
}

// Server Action bound to the "Suspend" button — suspends a company.
export async function suspendCompany(formData: FormData) {
  await patchCompany(formData.get('id') as string, 'suspend');
}