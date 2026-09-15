'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, GlassCard, Pagination, Segmented, Skeleton } from '../../../components/ui';
import { formatDate } from '../../../lib/labels';

const PAGE_SIZE = 15;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setUsers(data.users || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { '': users.length, buyer: 0, supplier: 0 };
    for (const u of users) c[u.role === 'supplier' ? 'supplier' : 'buyer'] += 1;
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const r = u.role === 'supplier' ? 'supplier' : 'buyer';
      if (role && r !== role) return false;
      if (!q) return true;
      return [u.fullName, u.phoneNumber, u.email, u.city, u.carMake, u.carModel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [users, role, query]);

  useEffect(() => setPage(1), [role, query]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">المستخدمون</p>
          <h1 className="text-2xl font-bold text-white">المشترون والموردون</h1>
          <p className="mt-1 text-sm text-muted">كل حساب مسجّل في التطبيق عبر الجوال أو جوجل.</p>
        </div>
        <button type="button" onClick={load} className="btn-ghost">
          ↻ تحديث
        </button>
      </header>

      <GlassCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <input
            type="search"
            placeholder="ابحث بالاسم، الجوال، الإيميل أو المدينة…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input max-w-sm flex-1"
          />
          <div className="ms-auto">
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: '', label: 'الكل', count: counts[''] },
                { value: 'buyer', label: 'مشترون', count: counts.buyer },
                { value: 'supplier', label: 'موردون', count: counts.supplier },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton rows={8} />
        ) : pageItems.length === 0 ? (
          <EmptyState icon="☺" title="لا يوجد مستخدمون مطابقون" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 text-start font-semibold">المستخدم</th>
                  <th className="px-3 text-start font-semibold">الجوال</th>
                  <th className="px-3 text-start font-semibold">المدينة</th>
                  <th className="px-3 text-start font-semibold">السيارة</th>
                  <th className="px-3 text-center font-semibold">الطلبات</th>
                  <th className="px-3 text-start font-semibold">الدور</th>
                  <th className="px-5 text-start font-semibold">انضم</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((u) => (
                  <tr key={u._id} className="table-row h-14">
                    <td className="px-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary-bright">
                          {u.fullName ? u.fullName.trim()[0] : '•'}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">{u.fullName || 'بدون اسم'}</div>
                          <div className="truncate text-xs text-muted" dir="ltr">
                            {u.email || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 text-ink" dir="ltr">
                      {u.phoneNumber ? `+966 ${u.phoneNumber}` : '—'}
                    </td>
                    <td className="px-3 text-muted">
                      {u.role === 'supplier' ? u.supplier?.city : u.city || '—'}
                    </td>
                    <td className="px-3 text-muted">
                      {[u.carMake, u.carModel, u.carYear].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="num px-3 text-center font-semibold text-white">{u.requestsCount ?? 0}</td>
                    <td className="px-3">
                      {u.role === 'supplier' ? (
                        <Badge tone={u.supplier?.status === 'approved' ? 'success' : 'accent'}>
                          مورد{u.supplier?.shopName ? ` • ${u.supplier.shopName}` : ''}
                        </Badge>
                      ) : (
                        <Badge tone="primary" dot={false}>
                          مشتري
                        </Badge>
                      )}
                    </td>
                    <td className="num px-5 text-xs text-muted">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </GlassCard>
    </div>
  );
}
