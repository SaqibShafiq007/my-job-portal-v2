// frontend/app/api/companies/members/[recruiterId]/route.ts
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ recruiterId: string }> };

async function getToken() {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value;
}

async function readJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { error: { message: 'Unexpected response from server' } };
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { recruiterId } = await params;
  const body = await req.json();
  const token = await getToken();

  const res = await fetch(`${process.env.API_URL}/api/companies/members/${recruiterId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return NextResponse.json(await readJson(res), { status: res.status });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { recruiterId } = await params;
  const token = await getToken();

  const res = await fetch(`${process.env.API_URL}/api/companies/members/${recruiterId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Backend returns 204 with an empty body on success
  if (res.status === 204) return new NextResponse(null, { status: 204 });

  return NextResponse.json(await readJson(res), { status: res.status });
}