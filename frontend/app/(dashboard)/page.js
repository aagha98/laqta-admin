import { cookies } from 'next/headers';
import { apiFetch } from '../../lib/apiClient';

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session').value;
  const stats = await apiFetch('/api/admin/requests/stats', token);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers} />
        <StatCard label="Total requests" value={stats.totalRequests} />
        <StatCard label="Submitted" value={stats.submitted} />
        <StatCard label="Under review" value={stats.underReview} />
        <StatCard label="Matched" value={stats.matched} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Cancelled" value={stats.cancelled} />
      </div>
    </div>
  );
}
