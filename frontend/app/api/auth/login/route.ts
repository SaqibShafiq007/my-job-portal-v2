import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${process.env.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: 'Server unavailable. Try again shortly.' },
      { status: 503 },
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    return NextResponse.json(
      err ?? {
        message:
          res.status === 429
            ? 'Too many attempts. Please wait and try again.'
            : 'Login failed',
      },
      { status: res.status },
    );
  }

  const { accessToken, refreshToken, role } = await res.json();

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}