'use client';

import { useEffect } from 'react';

const TONE = {
  primary: 'border-primary/40 bg-primary/10 text-primary-bright',
  accent: 'border-accent/40 bg-accent/10 text-accent-bright',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  muted: 'border-white/15 bg-white/5 text-muted',
};

const DOT = {
  primary: 'bg-primary-bright',
  accent: 'bg-accent-bright',
  success: 'bg-success',
  danger: 'bg-danger',
  muted: 'bg-muted',
};

export function Badge({ tone = 'muted', children, dot = true, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONE[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}

export function Tag({ children, className = '' }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md border border-line bg-white/5 px-2 py-0.5 text-[11px] font-medium text-ink ${className}`}
    >
      {children}
    </span>
  );
}

export function GlassCard({ title, subtitle, action, children, className = '', padded = true }) {
  return (
    <section className={`glass ${padded ? 'p-5' : ''} ${className}`}>
      {(title || action) && (
        <header
          className={`flex items-start justify-between gap-4 ${padded ? 'mb-4' : 'px-5 pt-5 pb-3'}`}
        >
          <div>
            {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, hint, tone = 'primary', icon, highlight = false }) {
  const glow = highlight ? 'shadow-glow-amber border-accent/40' : '';
  return (
    <div className={`glass flex flex-col gap-3 p-4 ${glow}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        {icon && (
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg ${
              tone === 'accent' ? 'bg-accent/15 text-accent-bright' : 'bg-primary/15 text-primary-bright'
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="num text-3xl font-bold leading-none text-white">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = '◌', title, body }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary-bright">
        {icon}
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
    </div>
  );
}

export function Stars({ value = 0, size = 'text-sm' }) {
  const rounded = Math.round(value);
  return (
    <span className={`inline-flex ${size} leading-none`} dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rounded ? 'text-accent-bright' : 'text-white/15'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Countdown({ expiresAt, status }) {
  if (!['submitted', 'underReview'].includes(status) || !expiresAt) return <span className="text-muted">—</span>;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return <Badge tone="muted" dot={false}>انتهى</Badge>;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const label = hours >= 24 ? `${Math.floor(hours / 24)} ي ${hours % 24} س` : hours > 0 ? `${hours} س ${minutes} د` : `${minutes} د`;
  return (
    <Badge tone={hours < 6 ? 'accent' : 'muted'} dot={hours < 6}>
      <span className="num">{label}</span>
    </Badge>
  );
}

export function Photo({ id, size = 'h-10 w-10', className = '' }) {
  if (!id) {
    return (
      <div className={`${size} grid shrink-0 place-items-center rounded-lg bg-white/5 text-muted ${className}`}>
        ▫
      </div>
    );
  }
  return (
    <a href={`/api/admin/photos/${id}`} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={`/api/admin/photos/${id}`}
        alt=""
        className={`${size} rounded-lg object-cover ring-1 ring-white/10 ${className}`}
      />
    </a>
  );
}

export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="close" onClick={onClose} className="flex-1 bg-black/60" />
      <aside className={`glass-raised flex h-full w-full ${width} flex-col overflow-hidden rounded-none rounded-s-3xl`}>
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost h-9 w-9 !p-0">
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm text-ink">{children ?? '—'}</span>
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-black/40 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            value === opt.value ? 'bg-primary/20 text-primary-bright shadow-glow' : 'text-muted hover:text-ink'
          }`}
        >
          {opt.label}
          {opt.count != null && <span className="num ms-1.5 text-[10px] opacity-70">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 text-xs text-muted">
      <span className="num">
        {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} من {total}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="btn-ghost !px-3 !py-1">
          السابق
        </button>
        <span className="num px-2 text-ink">
          {page} / {pages}
        </span>
        <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="btn-ghost !px-3 !py-1">
          التالي
        </button>
      </div>
    </div>
  );
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
      ))}
    </div>
  );
}
