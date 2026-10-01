// frontend/app/api/applicants/profile/resume/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  const res = await fetch(`${process.env.API_URL}/api/applicants/profile/resume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return NextResponse.json(await res.json(), { status: res.status });
}