import Link from 'next/link';
import { apiFetch } from '../../lib/apiClient';
import { requireAdminToken } from './layout';
import { Badge, GlassCard, Kpi, EmptyState } from '../../components/ui';
import { AreaChart, Donut, DonutLegend } from '../../components/charts';
import {
  CATEGORY,
  STATUS,
  formatMinutes,
  formatNumber,
  formatSar,
  timeAgo,
  timeLeft,
} from '../../lib/labels';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const token = await requireAdminToken();
  const data = await apiFetch('/api/admin/dashboard', token);
  const { kpis, categoryCounts, series, attention, recent, statusCounts } = data;

  const categorySlices = Object.entries(categoryCounts)
    .map(([key, value]) => ({ label: CATEGORY[key] ?? key, value }))
    .filter((s) => s.value > 0);

  const attentionCount =
    attention.pendingSuppliers.length + attention.expiringSoon.length + attention.awaitingRating.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary-bright">لوحة التحكم</p>
          <h1 className="text-2xl font-bold text-white">نظرة عامة على السوق</h1>
          <p className="mt-1 text-sm text-muted">أرقام حية من قاعدة البيانات — آخر 30 يومًا للرسوم البيانية.</p>
        </div>
        <Link href="/requests" className="btn-secondary">
          عرض الطلبات
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="طلبات نشطة" value={formatNumber(kpis.activeRequests)} hint={`${formatNumber(kpis.requestsToday)} اليوم`} icon="⚙" />
        <Kpi label="عروض اليوم" value={formatNumber(kpis.offersToday)} hint={`نسبة القبول ${kpis.acceptanceRate}%`} icon="◈" />
        <Kpi
          label="موردون بانتظار الاعتماد"
          value={formatNumber(kpis.pendingSuppliers)}
          hint={kpis.pendingSuppliers > 0 ? 'يحتاجون مراجعة' : 'لا يوجد'}
          icon="⌂"
          tone="accent"
          highlight={kpis.pendingSuppliers > 0}
        />
        <Kpi label="موردون معتمدون" value={formatNumber(kpis.approvedSuppliers)} icon="✓" />
        <Kpi label="صفقات مكتملة" value={formatNumber(kpis.completedDeals)} hint={`${formatNumber(kpis.buyers)} مشترٍ`} icon="★" />
        <Kpi label="متوسط أول عرض" value={formatMinutes(kpis.avgFirstOfferMinutes)} hint="من إنشاء الطلب" icon="◷" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <GlassCard
          className="xl:col-span-2"
          title="الطلبات والعروض"
          subtitle="عدد الطلبات الواردة مقابل عروض الموردين، يوميًا"
          action={
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-primary-bright">
                <span className="h-2 w-2 rounded-full bg-primary-bright" /> طلبات
              </span>
              <span className="flex items-center gap-1.5 text-accent-bright">
                <span className="h-2 w-2 rounded-full bg-accent-bright" /> عروض
              </span>
            </div>
          }
        >
          <AreaChart series={series} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            {[
              ['submitted', 'بانتظار العروض'],
              ['underReview', 'وصلت عروض'],
              ['matched', 'تم الاختيار'],
            ].map(([key, label]) => (
              <div key={key}>
                <div className="num text-xl font-bold text-white">{formatNumber(statusCounts[key] ?? 0)}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="فئات السيارات" subtitle="حصة كل فئة من طلبات القطع">
          {categorySlices.length === 0 ? (
            <EmptyState title="لا توجد طلبات بعد" />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Donut slices={categorySlices} />
              <div className="w-full">
                <DonutLegend slices={categorySlices} />
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassCard
          title="يحتاج انتباهك"
          subtitle="إجراءات معلّقة عليك أو على العملاء"
          action={attentionCount > 0 && <Badge tone="accent">{attentionCount} بند</Badge>}
        >
          {attentionCount === 0 ? (
            <EmptyState icon="✓" title="كل شيء تحت السيطرة" body="لا توجد بنود معلّقة الآن." />
          ) : (
            <ul className="space-y-2">
              {attention.pendingSuppliers.map((u) => (
                <AttentionItem
                  key={u._id}
                  href="/suppliers"
                  tone="accent"
                  icon="⌂"
                  title={`طلب انضمام: ${u.supplier?.shopName ?? '—'}`}
                  meta={`${u.supplier?.city ?? ''} • ${timeAgo(u.supplier?.appliedAt)}`}
                  cta="مراجعة"
                />
              ))}
              {attention.expiringSoon.map((r) => (
                <AttentionItem
                  key={r._id}
                  href="/requests"
                  tone="danger"
                  icon="◷"
                  title={`ينتهي قريبًا بدون عروض: ${r.title}`}
                  meta={`${r.city ?? ''} • ${timeLeft(r.expiresAt)?.label ?? ''}`}
                  cta="فتح"
                />
              ))}
              {attention.awaitingRating.map((r) => (
                <AttentionItem
                  key={r._id}
                  href="/requests?status=matched"
                  tone="primary"
                  icon="★"
                  title={`تم اختيار عرض ولم يُقيَّم: ${r.title}`}
                  meta={`منذ ${timeAgo(r.updatedAt)}`}
                  cta="متابعة"
                />
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard title="آخر النشاط" subtitle="أحدث الطلبات والعروض على المنصة">
          <ul className="space-y-2">
            {[
              ...recent.requests.map((r) => ({
                key: `r${r._id}`,
                at: r.createdAt,
                icon: '⚙',
                tone: 'primary',
                title: r.title,
                meta: `طلب جديد • ${CATEGORY[r.category] ?? ''} • ${r.city ?? ''}`,
                badge: STATUS[r.status],
              })),
              ...recent.offers.map((o) => ({
                key: `o${o._id}`,
                at: o.createdAt,
                icon: '◈',
                tone: 'accent',
                title: `${o.supplierName} → ${o.request?.title ?? '—'}`,
                meta: `عرض بسعر ${formatSar(o.price)}`,
                badge: null,
              })),
            ]
              .sort((a, b) => new Date(b.at) - new Date(a.at))
              .slice(0, 8)
              .map((item) => (
                <li key={item.key} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${
                      item.tone === 'accent' ? 'bg-accent/15 text-accent-bright' : 'bg-primary/15 text-primary-bright'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                    <div className="truncate text-xs text-muted">{item.meta}</div>
                  </div>
                  {item.badge && <Badge tone={item.badge.tone}>{item.badge.label}</Badge>}
                  <span className="num shrink-0 text-xs text-muted">{timeAgo(item.at)}</span>
                </li>
              ))}
            {recent.requests.length + recent.offers.length === 0 && <EmptyState title="لا يوجد نشاط بعد" />}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

function AttentionItem({ href, tone, icon, title, meta, cta }) {
  const toneClass =
    tone === 'accent'
      ? 'bg-accent/15 text-accent-bright'
      : tone === 'danger'
        ? 'bg-danger/15 text-danger'
        : 'bg-primary/15 text-primary-bright';
  return (
    <li className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm ${toneClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{title}</div>
        <div className="truncate text-xs text-muted">{meta}</div>
      </div>
      <Link href={href} className="btn-secondary !px-3 !py-1 text-xs">
        {cta}
      </Link>
    </li>
  );
}
