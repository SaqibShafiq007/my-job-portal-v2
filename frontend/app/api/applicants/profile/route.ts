import { NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';

async function relay(res: Response) {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: { code: 'BAD_RESPONSE', message: 'Unexpected server response' } };
  }
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  return relay(await apiFetch('/api/applicants/profile'));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return relay(
    await apiFetch('/api/applicants/profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  return relay(
    await apiFetch('/api/applicants/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  );
}