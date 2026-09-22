'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/', label: 'لوحة التحكم', icon: '▦' },
  { href: '/requests', label: 'طلبات القطع', icon: '⚙', badgeKey: 'activeRequests' },
  { href: '/suppliers', label: 'التشاليح والموردون', icon: '⌂', badgeKey: 'pendingSuppliers', badgeTone: 'accent' },
  { href: '/offers', label: 'العروض', icon: '◈' },
  { href: '/disputes', label: 'البلاغات', icon: '⚑', badgeKey: 'openDisputes', badgeTone: 'accent' },
  { href: '/users', label: 'المستخدمون', icon: '☺' },
];

export default function Sidebar({ counts = {}, adminEmail = '' }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/session', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="glass-raised sticky top-4 flex h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-3xl p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-xl text-primary-bright shadow-glow">
          ⚙
        </span>
        <div>
          <div className="text-lg font-bold leading-tight text-white">لقطة</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-bright">
            LAQTA ADMIN
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const badge = item.badgeKey ? counts[item.badgeKey] : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-primary/15 text-primary-bright shadow-glow'
                  : 'text-muted hover:bg-white/5 hover:text-ink'
              }`}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className={`num rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.badgeTone === 'accent' ? 'bg-accent text-canvas' : 'bg-primary/25 text-primary-bright'
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary-bright">
            {adminEmail ? adminEmail[0].toUpperCase() : 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink">{adminEmail || 'Admin'}</div>
            <div className="text-[11px] text-muted">مدير النظام</div>
          </div>
          <button type="button" onClick={logout} className="btn-ghost !px-2 !py-1 text-xs" title="تسجيل الخروج">
            خروج
          </button>
        </div>
      </div>
    </aside>
  );
}
