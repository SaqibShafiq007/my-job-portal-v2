// frontend/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Best effort: revoke the refresh token on the backend.
  // Even if this fails, we still clear the cookies below.
  if (refreshToken) {
    try {
      await fetch(`${process.env.API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // backend unreachable: ignore, local logout still happens
    }
  }

  const response = NextResponse.json({ ok: true });
  const expired = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
  response.cookies.set('access_token', '', expired);
  response.cookies.set('refresh_token', '', expired);
  return response;
}