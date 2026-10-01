// app/admin/users/actions.ts
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Sends a suspend or activate PATCH request to the admin API for a given user.
async function patchUser(id: string, action: 'suspend' | 'activate') {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  await fetch(`${process.env.API_URL}/api/admin/users/${id}/${action}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  revalidatePath('/admin/users');
}

// Server Action bound to the "Suspend" button — suspends a user's account.
export async function suspendUser(formData: FormData) {
  await patchUser(formData.get('id') as string, 'suspend');
}

// Server Action bound to the "Activate" button — reactivates a suspended user.
export async function activateUser(formData: FormData) {
  await patchUser(formData.get('id') as string, 'activate');
}