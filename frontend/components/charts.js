'use client';

import { useState } from 'react';
import { formatDay } from '../lib/labels';

// Small dependency-free SVG charts. Enough for a 30-day trend and a
// category split; swap for a library when the dashboard needs more.

export function AreaChart({ series, height = 220 }) {
  const [hover, setHover] = useState(null);
  const width = 720;
  const pad = { top: 16, right: 12, bottom: 28, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...series.flatMap((d) => [d.requests, d.offers]));
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const x = (i) => pad.left + i * step;
  const y = (v) => pad.top + h - (v / max) * h;

  const path = (key) => series.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d[key])}`).join(' ');
  const area = (key) => `${path(key)} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div className="relative" dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="gTeal" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0EA5A0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0EA5A0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gAmber" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFB020" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFB020" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.left - 8} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#8FA19D" className="num">
              {t}
            </text>
          </g>
        ))}
        <path d={area('requests')} fill="url(#gTeal)" />
        <path d={area('offers')} fill="url(#gAmber)" />
        <path d={path('requests')} fill="none" stroke="#5ED9D3" strokeWidth="2" />
        <path d={path('offers')} fill="none" stroke="#FFBD58" strokeWidth="2" />
        {series.map((d, i) => (
          <g key={d.date}>
            {i % 6 === 0 && (
              <text x={x(i)} y={height - 8} fontSize="10" textAnchor="middle" fill="#8FA19D">
                {formatDay(d.date)}
              </text>
            )}
            <rect
              x={x(i) - step / 2}
              y={pad.top}
              width={step}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + h} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(series[hover].requests)} r="4" fill="#5ED9D3" />
            <circle cx={x(hover)} cy={y(series[hover].offers)} r="4" fill="#FFBD58" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="glass-raised pointer-events-none absolute top-2 rounded-lg px-3 py-2 text-xs"
          style={{ left: `${(x(hover) / width) * 100}%`, transform: 'translateX(-50%)' }}
          dir="rtl"
        >
          <div className="mb-1 text-muted">{formatDay(series[hover].date)}</div>
          <div className="text-primary-bright">
            طلبات: <span className="num font-bold">{series[hover].requests}</span>
          </div>
          <div className="text-accent-bright">
            عروض: <span className="num font-bold">{series[hover].offers}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DONUT_COLORS = ['#5ED9D3', '#FFBD58', '#22C55E', '#8FA19D', '#0EA5A0', '#3D4948'];

export function Donut({ slices, size = 160, centerLabel }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 62;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} dir="ltr">
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
      {total > 0 &&
        slices.map((s, i) => {
          const frac = s.value / total;
          const el = (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="18"
              strokeDasharray={`${frac * c} ${c}`}
              strokeDashoffset={-offset * c}
              transform="rotate(-90 80 80)"
              strokeLinecap="butt"
            />
          );
          offset += frac;
          return el;
        })}
      <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff" className="num">
        {centerLabel ?? total}
      </text>
      <text x="80" y="96" textAnchor="middle" fontSize="10" fill="#8FA19D">
        إجمالي
      </text>
    </svg>
  );
}

export function DonutLegend({ slices }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  return (
    <ul className="space-y-1.5 text-sm">
      {slices.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
          <span className="flex-1 text-ink">{s.label}</span>
          <span className="num text-muted">
            {total ? Math.round((s.value / total) * 100) : 0}%
          </span>
          <span className="num w-8 text-end font-semibold text-white">{s.value}</span>
        </li>
      ))}
    </ul>
  );
}
