import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyToken } from '../../lib/auth';
import LogoutButton from './LogoutButton';

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
  await requireAdminToken();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold text-ink">LAQTA Admin</span>
            <nav className="flex gap-6 text-sm font-medium text-muted">
              <Link href="/" className="hover:text-ink">
                Dashboard
              </Link>
              <Link href="/requests" className="hover:text-ink">
                Requests
              </Link>
              <Link href="/users" className="hover:text-ink">
                Users
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
