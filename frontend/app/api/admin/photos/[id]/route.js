import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '../../../../../lib/apiClient';

// Streams a photo from the backend so the browser never needs the internal
// backend hostname (it's http://backend:4000 inside Docker).
export async function GET(request, { params }) {
  const cookieStore = await cookies();
  if (!cookieStore.get('admin_session')?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_URL}/api/photos/${params.id}`, { cache: 'no-store' });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Photo not found' }, { status: upstream.status });
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
