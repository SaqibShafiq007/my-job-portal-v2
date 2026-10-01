import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${process.env.API_URL}/api/jobs/${id}/close`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return NextResponse.json(await res.json(), { status: res.status });
}