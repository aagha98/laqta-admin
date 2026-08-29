import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '../../../../lib/apiClient';

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { search } = new URL(request.url);

  try {
    const data = await apiFetch(`/api/admin/requests${search}`, token);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
