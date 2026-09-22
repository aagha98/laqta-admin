'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, GlassCard, Photo, Segmented, Skeleton, Tag } from '../../../components/ui';
import { DISPUTE_REASON, formatSar, timeAgo } from '../../../lib/labels';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('open');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/disputes');
    const data = await response.json();
    setDisputes(data.disputes || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { '': disputes.length, open: 0, resolved: 0 };
    for (const d of disputes) c[d.status] = (c[d.status] ?? 0) + 1;
    return c;
  }, [disputes]);

  const filtered = disputes.filter((d) => !status || d.status === status);

  async function resolve(id, requestStatus) {
    const resolution = window.prompt('ملاحظة الإغلاق (تظهر للطرفين):');
    if (resolution === null) return;
    setBusyId(id);
    await fetch(`/api/admin/disputes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, requestStatus }),
    });
    setBusyId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">البلاغات</p>
          <h1 className="text-2xl font-bold text-white">بلاغات الصفقات</h1>
          <p className="mt-1 text-sm text-muted">
            بلاغ يفتحه المشتري بعد قبول عرض. راجع الطرفين ثم أغلق البلاغ بقرار.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-ghost">
          ↻ تحديث
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: 'open', label: 'مفتوح', count: counts.open },
            { value: 'resolved', label: 'مغلق', count: counts.resolved },
            { value: '', label: 'الكل', count: counts[''] },
          ]}
        />
      </div>

      {loading ? (
        <GlassCard padded={false}>
          <Skeleton rows={3} />
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <EmptyState icon="✓" title="لا توجد بلاغات" body="لا شيء يحتاج تدخلك الآن." />
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => (
            <article key={d._id} className="glass space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">
                      {d.request?.title ?? '—'}
                    </h2>
                    {d.request?.shortCode && <Tag>#{d.request.shortCode}</Tag>}
                    <Badge tone={d.status === 'open' ? 'danger' : 'success'}>
                      {d.status === 'open' ? 'مفتوح' : 'مغلق'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-accent-bright">
                    {DISPUTE_REASON[d.reason] ?? d.reason}
                  </div>
                </div>
                <span className="num text-xs text-muted">{timeAgo(d.createdAt)}</span>
              </div>

              {d.details && <p className="text-sm text-ink">{d.details}</p>}

              {d.photos?.length > 0 && (
                <div className="flex gap-2">
                  {d.photos.map((id) => (
                    <Photo key={id} id={id} size="h-20 w-24" />
                  ))}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">المشتري</div>
                  <div className="text-sm text-ink">{d.buyer?.fullName || 'بدون اسم'}</div>
                  <div className="num text-xs text-muted" dir="ltr">
                    {d.buyer?.phoneNumber ? `+966 ${d.buyer.phoneNumber}` : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-white/[0.02] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">المورد</div>
                  <div className="text-sm text-ink">
                    {d.supplier?.supplier?.shopName || d.supplier?.fullName || '—'}
                  </div>
                  <div className="num text-xs text-muted" dir="ltr">
                    {d.supplier?.phoneNumber ? `+966 ${d.supplier.phoneNumber}` : '—'}
                  </div>
                  {d.offer?.price != null && (
                    <div className="num mt-1 text-xs text-accent-bright">{formatSar(d.offer.price)}</div>
                  )}
                </div>
              </div>

              {d.status === 'resolved' ? (
                d.resolution && (
                  <p className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-ink">
                    {d.resolution}
                  </p>
                )
              ) : (
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  <button
                    type="button"
                    disabled={busyId === d._id}
                    onClick={() => resolve(d._id, 'completed')}
                    className="btn-primary !px-3 !py-1.5 text-xs"
                  >
                    إغلاق — الصفقة تمت
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d._id}
                    onClick={() => resolve(d._id, 'cancelled')}
                    className="btn-danger !px-3 !py-1.5 text-xs"
                  >
                    إغلاق — إلغاء الطلب
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d._id}
                    onClick={() => resolve(d._id, null)}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    إغلاق بدون تغيير
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
