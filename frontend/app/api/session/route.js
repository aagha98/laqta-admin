import { NextResponse } from 'next/server';
import { BACKEND_URL } from '../../../lib/apiClient';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  let backendResponse;
  try {
    backendResponse = await fetch(`${BACKEND_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Render's free tier sleeps; the first request can take ~25s to wake it.
      signal: AbortSignal.timeout(45000),
    });
  } catch {
    return NextResponse.json(
      { error: 'الخادم لا يستجيب الآن (قد يكون يستيقظ من السكون). حاول مرة أخرى بعد 30 ثانية.' },
      { status: 503 },
    );
  }
  const data = await backendResponse.json().catch(() => ({}));

  if (!backendResponse.ok) {
    const error =
      backendResponse.status === 401 ? 'البريد أو كلمة المرور غير صحيحة.' : data.error || 'تعذر تسجيل الدخول.';
    return NextResponse.json({ error }, { status: backendResponse.status });
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
