import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${process.env.API_URL}/api/jobs/${id}/publish`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const data = await res.json().catch(() => null);

  return NextResponse.json(
    data ?? { error: { code: 'BAD_GATEWAY', message: 'Unexpected response from server' } },
        { status: data ? res.status : res.ok ? 502 : res.status }
  );
}