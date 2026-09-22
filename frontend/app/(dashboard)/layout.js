import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '../../lib/auth';
import { apiFetch } from '../../lib/apiClient';
import Sidebar from '../../components/Sidebar';

export async function requireAdminToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.role !== 'admin') {
    redirect('/login');
  }

  return token;
}

export default async function DashboardLayout({ children }) {
  const token = await requireAdminToken();
  let counts = {};
  try {
    const [stats, disputes] = await Promise.all([
      apiFetch('/api/admin/requests/stats', token),
      apiFetch('/api/admin/disputes?status=open', token).catch(() => ({ disputes: [] })),
    ]);
    counts = {
      activeRequests: (stats.submitted ?? 0) + (stats.underReview ?? 0),
      pendingSuppliers: stats.pendingSuppliers ?? 0,
      openDisputes: disputes.disputes?.length ?? 0,
    };
  } catch {
    counts = {};
  }

  return (
    <div className="mx-auto flex max-w-[1600px] gap-6 p-4 lg:p-6">
      <Sidebar counts={counts} adminEmail={process.env.ADMIN_EMAIL || ''} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
