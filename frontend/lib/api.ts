// frontend/lib/api.ts
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL!;


export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}