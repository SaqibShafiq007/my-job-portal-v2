// frontend/app/api/applicants/shortlist/[jobId]/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${process.env.API_URL}/api/applicants/shortlist/${jobId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Backend returns 204 with an empty body on success
  if (res.status === 204) return new NextResponse(null, { status: 204 });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = { error: { message: 'Unexpected response from server' } };
  }
  return NextResponse.json(body, { status: res.status });
}