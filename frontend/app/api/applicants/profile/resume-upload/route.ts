// frontend/app/api/applicants/profile/resume-upload/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${process.env.API_URL}/api/applicants/profile/resume-upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return NextResponse.json(await res.json(), { status: res.status });
}