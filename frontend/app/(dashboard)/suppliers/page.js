'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, GlassCard, Photo, Segmented, Skeleton, Stars, Tag } from '../../../components/ui';
import { CATEGORY, SUPPLIER_STATUS, formatDate, timeAgo } from '../../../lib/labels';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/suppliers');
    const data = await response.json();
    setSuppliers(data.suppliers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { '': suppliers.length };
    for (const u of suppliers) {
      const s = u.supplier?.status ?? 'pending';
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [suppliers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((u) => {
      if (status && (u.supplier?.status ?? 'pending') !== status) return false;
      if (!q) return true;
      return [u.supplier?.shopName, u.fullName, u.phoneNumber, u.supplier?.city, u.supplier?.licenseNumber]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [suppliers, status, query]);

  async function review(id, next) {
    let rejectionReason = '';
    if (next === 'rejected') {
      const reason = window.prompt('سبب الرفض (يظهر للمورد في التطبيق):');
      if (reason === null) return;
      rejectionReason = reason;
    }
    setBusyId(id);
    await fetch(`/api/admin/suppliers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, rejectionReason }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">الموردون</p>
          <h1 className="text-2xl font-bold text-white">التشاليح والموردون</h1>
          <p className="mt-1 text-sm text-muted">
            المورد المعتمد فقط يستقبل الطلبات ويرسل العروض. راجع السجل التجاري وصورة المحل قبل الاعتماد.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-ghost">
          ↻ تحديث
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="ابحث باسم التشليح، المالك، الجوال أو السجل…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input max-w-sm flex-1"
        />
        <div className="ms-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pending', label: 'قيد المراجعة', count: counts.pending ?? 0 },
              { value: 'approved', label: 'معتمد', count: counts.approved ?? 0 },
              { value: 'rejected', label: 'مرفوض', count: counts.rejected ?? 0 },
              { value: '', label: 'الكل', count: counts[''] },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <GlassCard padded={false}>
          <Skeleton rows={4} />
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <EmptyState icon="⌂" title="لا يوجد موردون هنا" body="لا توجد سجلات مطابقة للفلتر الحالي." />
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((u) => {
            const s = u.supplier || {};
            const st = SUPPLIER_STATUS[s.status] ?? SUPPLIER_STATUS.pending;
            return (
              <article key={u._id} className="glass flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <Photo id={s.shopPhoto} size="h-14 w-14" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-white">{s.shopName || '—'}</h2>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="text-sm text-muted">
                      {u.fullName || 'بدون اسم'} • {s.city || '—'}
                    </div>
                    <div className="num text-xs text-muted" dir="ltr">
                      {u.phoneNumber ? `+966 ${u.phoneNumber}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(s.specialties || []).map((c) => (
                    <Tag key={c}>{CATEGORY[c] ?? c}</Tag>
                  ))}
                </div>

                <dl className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-white/[0.02] p-3 text-center">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">السجل التجاري</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink" dir="ltr">
                      {s.licenseNumber || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">التقييم</dt>
                    <dd className="mt-0.5 flex items-center justify-center gap-1 text-sm">
                      {s.ratingCount ? (
                        <>
                          <span className="num font-semibold text-accent-bright">{u.supplierRating}</span>
                          <Stars value={u.supplierRating} size="text-xs" />
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-muted">صفقات</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink">{s.completedDeals ?? 0}</dd>
                  </div>
                </dl>

                {s.status === 'rejected' && s.rejectionReason && (
                  <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                    {s.rejectionReason}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-xs text-muted">
                    تقدّم {timeAgo(s.appliedAt)}
                    {s.reviewedAt && ` • رُوجع ${formatDate(s.reviewedAt)}`}
                  </span>
                  <div className="flex gap-2">
                    {s.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={busyId === u._id}
                        onClick={() => review(u._id, 'approved')}
                        className="btn-primary !px-3 !py-1.5 text-xs"
                      >
                        اعتماد
                      </button>
                    )}
                    {s.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={busyId === u._id}
                        onClick={() => review(u._id, 'rejected')}
                        className="btn-danger !px-3 !py-1.5 text-xs"
                      >
                        رفض
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
