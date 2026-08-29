import { cookies } from 'next/headers';
import { apiFetch } from '../../../lib/apiClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session').value;
  const { users } = await apiFetch('/api/admin/users', token);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Users</h1>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Car</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user._id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{user.fullName || '—'}</td>
                <td className="px-4 py-3 text-muted">+966 {user.phoneNumber}</td>
                <td className="px-4 py-3 text-muted">{user.city || '—'}</td>
                <td className="px-4 py-3 text-muted">
                  {[user.carMake, user.carModel, user.carYear].filter(Boolean).join(' ') || '—'}
                </td>
                <td className="px-4 py-3 text-muted">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
