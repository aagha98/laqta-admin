'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, EmptyState, GlassCard, Pagination, Photo, Segmented, Skeleton, Tag } from '../../../components/ui';
import { CATEGORY, CONDITION, OFFER_STATUS, formatSar, timeAgo } from '../../../lib/labels';

const PAGE_SIZE = 15;

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/offers');
    const data = await response.json();
    setOffers(data.offers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { '': offers.length, flagged: 0 };
    for (const o of offers) {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.flagged) c.flagged += 1;
    }
    return c;
  }, [offers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (status && o.status !== status) return false;
      if (onlyFlagged && !o.flagged) return false;
      if (!q) return true;
      return [o.supplierName, o.supplierCity, o.request?.title, o.conditionDescription]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [offers, status, onlyFlagged, query]);

  useEffect(() => setPage(1), [status, onlyFlagged, query]);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">العروض</p>
          <h1 className="text-2xl font-bold text-white">كل العروض</h1>
          <p className="mt-1 text-sm text-muted">
            العروض المعلّمة تحتوي وصفًا يبدو أنه يحاول تمرير رقم تواصل خارج المنصة.
          </p>
        </div>
        <button type="button" onClick={load} className="btn-ghost">
          ↻ تحديث
        </button>
      </header>

      <GlassCard padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <input
            type="search"
            placeholder="ابحث بالمورد، القطعة أو الوصف…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input max-w-sm flex-1"
          />
          <button
            type="button"
            onClick={() => setOnlyFlagged((v) => !v)}
            className={onlyFlagged ? 'btn-danger !py-1.5 text-xs' : 'btn-ghost !py-1.5 text-xs'}
          >
            ⚑ مشبوهة <span className="num">{counts.flagged}</span>
          </button>
          <div className="ms-auto">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'الكل', count: counts[''] },
                { value: 'pending', label: OFFER_STATUS.pending.label, count: counts.pending ?? 0 },
                { value: 'accepted', label: OFFER_STATUS.accepted.label, count: counts.accepted ?? 0 },
                { value: 'rejected', label: OFFER_STATUS.rejected.label, count: counts.rejected ?? 0 },
              ]}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton rows={8} />
        ) : pageItems.length === 0 ? (
          <EmptyState icon="◈" title="لا توجد عروض مطابقة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 text-start font-semibold">المورد</th>
                  <th className="px-3 text-start font-semibold">الطلب</th>
                  <th className="px-3 text-start font-semibold">القطعة</th>
                  <th className="px-3 text-start font-semibold">السعر</th>
                  <th className="px-3 text-start font-semibold">الحالة</th>
                  <th className="px-5 text-start font-semibold">أُرسل</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((o) => (
                  <tr key={o._id} className={`table-row h-14 ${o.flagged ? 'bg-danger/5' : ''}`}>
                    <td className="px-5">
                      <div className="font-semibold text-ink">{o.supplierName}</div>
                      <div className="text-xs text-muted">
                        {o.supplierCity} {o.supplier ? '' : '• يدوي'}
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="text-ink">{o.request?.title ?? '—'}</div>
                      <div className="text-xs text-muted">
                        {CATEGORY[o.request?.category] ?? ''} {o.request?.city ? `• ${o.request.city}` : ''}
                      </div>
                    </td>
                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <Photo id={o.photos?.[0]} size="h-9 w-9" />
                        <div className="min-w-0">
                          <Tag>{CONDITION[o.conditionLabel] ?? o.conditionLabel}</Tag>
                          {o.conditionDescription && (
                            <div
                              className={`mt-1 max-w-[220px] truncate text-xs ${o.flagged ? 'text-danger' : 'text-muted'}`}
                            >
                              {o.flagged && '⚑ '}
                              {o.conditionDescription}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="num px-3 font-bold text-accent-bright">{formatSar(o.price)}</td>
                    <td className="px-3">
                      <Badge tone={OFFER_STATUS[o.status]?.tone}>{OFFER_STATUS[o.status]?.label}</Badge>
                    </td>
                    <td className="num px-5 text-xs text-muted">{timeAgo(o.createdAt)}</td>
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
