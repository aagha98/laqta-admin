'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Badge,
  Countdown,
  Drawer,
  EmptyState,
  Field,
  GlassCard,
  Pagination,
  Photo,
  Segmented,
  Skeleton,
  Stars,
  Tag,
} from '../../../components/ui';
import {
  CATEGORY,
  CONDITION,
  OFFER_STATUS,
  REQUEST_TYPE,
  STATUS,
  formatDate,
  formatSar,
  timeAgo,
  vehicleLabel,
} from '../../../lib/labels';

const PAGE_SIZE = 12;
const STATUS_ORDER = ['submitted', 'underReview', 'matched', 'completed', 'cancelled', 'expired'];

export default function RequestsPage() {
  return (
    <Suspense fallback={<Skeleton rows={8} />}>
      <RequestsPageInner />
    </Suspense>
  );
}

function RequestsPageInner() {
  const params = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(params.get('status') || '');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/admin/requests');
    const data = await response.json();
    setRequests(data.requests || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { '': requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (status && r.status !== status) return false;
      if (category && r.category !== category) return false;
      if (!q) return true;
      const hay = [r.title, r.subtitle, r.city, r.user?.fullName, r.user?.phoneNumber, r._id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [requests, status, category, query]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [status, category, query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">الطلبات</p>
          <h1 className="text-2xl font-bold text-white">طلبات القطع</h1>
          <p className="mt-1 text-sm text-muted">
            كل طلب يبقى مفتوحًا 72 ساعة للموردين. بعد اختيار عرض تنكشف بيانات الطرفين.
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
            placeholder="ابحث بالقطعة، السيارة، المدينة أو المشتري…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input max-w-sm flex-1"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-auto">
            <option value="">كل الفئات</option>
            {Object.entries(CATEGORY).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="ms-auto overflow-x-auto">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'الكل', count: counts[''] },
                ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s].label, count: counts[s] ?? 0 })),
              ]}
            />
          </div>
        </div>

        {loading ? (
          <Skeleton rows={8} />
        ) : pageItems.length === 0 ? (
          <EmptyState icon="⚙" title="لا توجد طلبات مطابقة" body="جرّب تغيير الفلاتر أو البحث." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="table-head text-start">
                  <th className="px-5 text-start font-semibold">القطعة والسيارة</th>
                  <th className="px-3 text-start font-semibold">الفئة</th>
                  <th className="px-3 text-start font-semibold">المشتري</th>
                  <th className="px-3 text-start font-semibold">المدينة</th>
                  <th className="px-3 text-center font-semibold">العروض</th>
                  <th className="px-3 text-start font-semibold">المتبقي</th>
                  <th className="px-3 text-start font-semibold">الحالة</th>
                  <th className="px-5 text-start font-semibold">أُنشئ</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r._id} onClick={() => setSelected(r)} className="table-row h-14 cursor-pointer">
                    <td className="px-5">
                      <div className="flex items-center gap-3">
                        <Photo id={r.photos?.[0]} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">{r.title}</div>
                          <div className="truncate text-xs text-muted">{vehicleLabel(r)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3">
                      <Tag>{r.type === 'sellCar' ? REQUEST_TYPE.sellCar : CATEGORY[r.category] ?? '—'}</Tag>
                    </td>
                    <td className="px-3">
                      <div className="text-ink">{r.user?.fullName || '—'}</div>
                      <div className="num text-xs text-muted" dir="ltr">
                        {r.user?.phoneNumber ? `+966 ${r.user.phoneNumber}` : ''}
                      </div>
                    </td>
                    <td className="px-3 text-muted">{r.city || r.user?.city || '—'}</td>
                    <td className="num px-3 text-center font-semibold text-white">{r.offersCount ?? 0}</td>
                    <td className="px-3">
                      <Countdown expiresAt={r.expiresAt} status={r.status} />
                    </td>
                    <td className="px-3">
                      <Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.label ?? r.status}</Badge>
                    </td>
                    <td className="num px-5 text-xs text-muted">{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onChange={setPage} />
      </GlassCard>

      <RequestDrawer request={selected} onClose={() => setSelected(null)} onChanged={load} />
    </div>
  );
}

function RequestDrawer({ request, onClose, onChanged }) {
  const [offers, setOffers] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request) return;
    setOffers(null);
    fetch(`/api/admin/requests/${request._id}/offers`)
      .then((r) => r.json())
      .then((d) => setOffers(d.offers || []));
  }, [request]);

  async function updateStatus(status) {
    setBusy(true);
    await fetch(`/api/admin/requests/${request._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    onChanged();
    onClose();
  }

  if (!request) return null;
  const accepted = offers?.find((o) => o.status === 'accepted');
  const details = Object.entries(request.details || {});

  return (
    <Drawer open={Boolean(request)} onClose={onClose} title={request.title}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS[request.status]?.tone}>{STATUS[request.status]?.label}</Badge>
          <Tag>{request.type === 'sellCar' ? REQUEST_TYPE.sellCar : CATEGORY[request.category]}</Tag>
          <Countdown expiresAt={request.expiresAt} status={request.status} />
          <span className="num ms-auto text-xs text-muted">#{request._id.slice(-6).toUpperCase()}</span>
        </div>

        {request.photos?.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {request.photos.map((id) => (
              <Photo key={id} id={id} size="h-28 w-36" />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="السيارة">{vehicleLabel(request) || '—'}</Field>
          <Field label="المدينة">{request.city || request.user?.city || '—'}</Field>
          <Field label="المشتري">{request.user?.fullName || '—'}</Field>
          <Field label="الجوال">
            <span className="num" dir="ltr">
              {request.user?.phoneNumber ? `+966 ${request.user.phoneNumber}` : '—'}
            </span>
          </Field>
          <Field label="أُنشئ">{formatDate(request.createdAt)}</Field>
          <Field label="ينتهي">{formatDate(request.expiresAt)}</Field>
        </div>

        {details.length > 0 && (
          <div className="rounded-xl border border-line bg-white/[0.02] p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">تفاصيل الطلب</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {request.rating?.stars && (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-3">
            <Stars value={request.rating.stars} />
            <span className="text-sm text-ink">قيّم المشتري المورد {request.rating.stars}/5</span>
            {request.rating.comment && <span className="text-xs text-muted">— {request.rating.comment}</span>}
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">العروض</h3>
            {offers && <span className="num text-xs text-muted">{offers.length} عرض</span>}
          </div>
          {offers == null ? (
            <Skeleton rows={2} />
          ) : offers.length === 0 ? (
            <EmptyState icon="◈" title="لا توجد عروض بعد" />
          ) : (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li
                  key={o._id}
                  className={`rounded-xl border p-3 ${
                    o.status === 'accepted' ? 'border-success/40 bg-success/5' : 'border-line bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Photo id={o.photos?.[0]} size="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-ink">{o.supplierName}</span>
                        {o.supplier ? <Tag>من التطبيق</Tag> : <Tag>يدوي</Tag>}
                      </div>
                      <div className="text-xs text-muted">
                        {o.supplierCity} • {CONDITION[o.conditionLabel] ?? o.conditionLabel} • ضمان {o.warrantyDays} يوم
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="num font-bold text-accent-bright">{formatSar(o.price)}</div>
                      <Badge tone={OFFER_STATUS[o.status]?.tone}>{OFFER_STATUS[o.status]?.label}</Badge>
                    </div>
                  </div>
                  {o.conditionDescription && (
                    <p className="mt-2 text-xs text-muted">{o.conditionDescription}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {accepted?.supplier && (
          <div className="rounded-xl border border-line bg-white/[0.02] p-4 text-sm">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">المورد المختار</div>
            <div className="text-ink">
              {accepted.supplier.supplier?.shopName} — {accepted.supplier.fullName}
            </div>
            <div className="num text-xs text-muted" dir="ltr">
              +966 {accepted.supplier.phoneNumber}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {['submitted', 'underReview'].includes(request.status) && (
            <button type="button" disabled={busy} onClick={() => updateStatus('cancelled')} className="btn-danger">
              إلغاء الطلب
            </button>
          )}
          {request.status === 'matched' && (
            <button type="button" disabled={busy} onClick={() => updateStatus('completed')} className="btn-secondary">
              تعليم كمكتمل
            </button>
          )}
          {['cancelled', 'expired'].includes(request.status) && (
            <button type="button" disabled={busy} onClick={() => updateStatus('submitted')} className="btn-secondary">
              إعادة فتح الطلب
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
