import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { apiFetch } from '../../../../../../../lib/apiClient';

export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await apiFetch(`/api/admin/requests/${params.id}/offers/${params.offerId}`, token, {
      method: 'DELETE',
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
