import { NextResponse } from 'next/server';
import { BACKEND_URL } from '../../../lib/apiClient';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  const backendResponse = await fetch(`${BACKEND_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    return NextResponse.json(data, { status: backendResponse.status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', '', { path: '/', maxAge: 0 });
  return response;
}
