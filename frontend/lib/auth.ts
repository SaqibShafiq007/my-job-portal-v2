import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export async function requireRole(role: string) {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) redirect('/login');
  if (decodeRole(token) !== role) redirect('/dashboard');
}