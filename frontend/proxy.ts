// frontend/proxy.ts
import { NextRequest, NextResponse } from 'next/server';

// Reads the role claim from the JWT payload (no signature check here;
// the backend still verifies the token on every API call).
function decodeRole(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

// Same options as app/api/auth/login/route.ts so the cookies stay identical.
const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function redirectToLogin(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete('access_token');
  res.cookies.delete('refresh_token');
  return res;
}

function roleAllowed(pathname: string, role: string): boolean {
  if (pathname.startsWith('/admin') && role !== 'admin') return false;
  return true;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const accessToken = req.cookies.get('access_token')?.value;
  const refreshToken = req.cookies.get('refresh_token')?.value;

  // Case 1: access token is present, so just check the role.
  if (accessToken) {
    const role = decodeRole(accessToken);
    if (!role) return redirectToLogin(req);
    if (!roleAllowed(pathname, role)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Case 2: no access token and no refresh token.
  if (!refreshToken) return redirectToLogin(req);

  // Case 3: access token expired, so try to refresh it.
  let data: { accessToken: string; refreshToken: string };
  try {
    const res = await fetch(`${process.env.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return redirectToLogin(req);
    data = await res.json();
  } catch {
    return redirectToLogin(req);
  }

  const role = decodeRole(data.accessToken);
  if (!role) return redirectToLogin(req);
  if (!roleAllowed(pathname, role)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Make this same request see the new cookies (server components read them),
  // and also send them to the browser.
  req.cookies.set('access_token', data.accessToken);
  req.cookies.set('refresh_token', data.refreshToken);
  const response = NextResponse.next({ request: { headers: req.headers } });
  response.cookies.set('access_token', data.accessToken, {
    ...baseCookie,
    maxAge: 60 * 15,
  });
  response.cookies.set('refresh_token', data.refreshToken, {
    ...baseCookie,
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};