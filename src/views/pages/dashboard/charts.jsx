/**
 * views/pages/dashboard/charts.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Chart primitives used only by el Dashboard. Inline SVG + divs a propósito
 * (sin librería de gráficas) para no romper la convención del proyecto de
 * pulir el sistema de diseño propio en vez de traer una dependencia nueva.
 *
 * Convenciones seguidas aquí: un solo tono (verde de marca) para series de
 * magnitud, colores de estado (verde/ámbar/rojo) reservados para semáforos
 * y siempre acompañados de un número o texto (nunca solo color), marcas
 * delgadas con extremos redondeados, leyenda solo cuando hay 2+ series, y
 * una capa de hover en cualquier marca no trivial.
 */
import { useState } from 'react';
import { statusColor } from './utils';

const GREEN = '#168A43';
const GREEN_SOFT = '#C8E6D4';
const TRACK = '#E6EBE6';

/** Anillo de avance — un solo valor, coloreado por estado. */
export function Gauge({ pct, size = 60, stroke = 7, label }) {
  const safePct = Math.max(0, Math.min(100, pct || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (safePct / 100) * c;
  const col = statusColor(safePct);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s ease' }} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: Math.round(size * 0.23), fontWeight: 800, fill: col }}>{Math.round(safePct)}%</text>
      </svg>
      {label && <span style={{ fontSize: 10, color: 'var(--grt)', fontWeight: 700, textAlign: 'center' }}>{label}</span>}
    </div>
  );
}

/** Mini tendencia de barras (por ejecutivo). Resalta la barra máxima. */
export function Sparkbars({ values, labels, width = 8, height = 28 }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height }}>
      {values.map((v, i) => (
        <div key={i} title={labels ? labels[i] + ': ' + v : String(v)}
          style={{
            width, height: Math.max(4, (v / max) * height), borderRadius: 3,
            background: v === max && v > 0 ? GREEN : GREEN_SOFT, transition: 'height .3s',
          }} />
      ))}
    </div>
  );
}

/** Insignia de cambio vs. un valor anterior (▲/▼), con color apto para fondo claro u oscuro. */
export function Delta({ current, previous, dark = false }) {
  if (previous == null) return null;
  const diff = current - previous;
  const flatColor = dark ? 'rgba(255,255,255,.7)' : 'var(--grt)';
  if (diff === 0) return <span style={{ fontSize: 10, color: flatColor, fontWeight: 700 }}>Igual que el mes anterior</span>;
  const up = diff > 0;
  const upColor = dark ? '#6FCF97' : '#168A43';
  const downColor = dark ? '#FF8A80' : '#C0392B';
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: up ? upColor : downColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {up ? '▲' : '▼'} {Math.abs(diff)} vs. mes anterior
    </span>
  );
}

/**
 * Barras mensuales con tooltip al pasar el mouse. Es una sola serie
 * (informes/mes), así que en vez de una leyenda lleva su propio título en
 * la tarjeta que la contiene.
 */
export function TrendChart({ months }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...months.map(m => m.cnt), 1);
  const total = months.reduce((s, m) => s + m.cnt, 0);
  const allZero = total === 0;
  const half = Math.ceil(months.length / 2);
  const firstHalf = months.slice(0, half).reduce((s, m) => s + m.cnt, 0);
  const secondHalf = months.slice(half).reduce((s, m) => s + m.cnt, 0);
  const trendUp = secondHalf >= firstHalf;

  if (allZero) {
    return (
      <div style={{ textAlign: 'center', padding: '26px 0', color: 'var(--grt)', fontSize: 12 }}>
        Aún no hay informes generados en este rango — el primero que crees aparecerá aquí.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        {months.map((m, i) => {
          const h = Math.max(6, (m.cnt / max) * 96);
          return (
            <div key={m.label + i} style={{ textAlign: 'center', flex: 1, position: 'relative' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(cur => cur === i ? null : cur)}>
              {hover === i && (
                <div style={{
                  position: 'absolute', bottom: h + 30, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--osc)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '6px 10px',
                  borderRadius: 6, whiteSpace: 'nowrap', zIndex: 5, boxShadow: '0 3px 10px rgba(0,0,0,.2)',
                  display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
                }}>
                  <span>{m.cnt} informe{m.cnt !== 1 ? 's' : ''}</span>
                  <span style={{ opacity: .75, fontWeight: 500 }}>{m.fullLabel || m.label}</span>
                  {i > 0 && <Delta current={m.cnt} previous={months[i - 1].cnt} dark />}
                </div>
              )}
              <div style={{
                height: h, background: m.cnt > 0 ? 'linear-gradient(180deg, ' + GREEN + ' 0%, ' + GREEN_SOFT + ' 100%)' : TRACK,
                borderRadius: '6px 6px 3px 3px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                paddingTop: 4, color: m.cnt > 0 ? '#fff' : 'var(--grt)', fontWeight: 800, fontSize: 11,
                cursor: 'default', transition: 'opacity .15s', opacity: hover === null || hover === i ? 1 : .55,
              }}>{m.cnt}</div>
              <div style={{ fontSize: 10, color: 'var(--grt)', marginTop: 5, textTransform: 'capitalize', fontWeight: hover === i ? 800 : 500 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px dashed var(--grb)', fontSize: 11, color: 'var(--grt)', flexWrap: 'wrap', gap: 6 }}>
        <span>Total del período: <strong style={{ color: 'var(--vd)' }}>{total}</strong> informes</span>
        <span style={{ fontWeight: 700, color: trendUp ? '#168A43' : '#9A7A10' }}>{trendUp ? '▲ En crecimiento' : '▼ En descenso'} vs. la primera mitad</span>
      </div>
    </div>
  );
}

/** Lista de barras horizontales con etiqueta de valor al final (magnitud). */
export function BarList({ items, valueSuffix = '', color = GREEN, emptyText = 'Sin datos todavía.' }) {
  if (!items.length) return <div style={{ color: 'var(--grt)', fontSize: 12, padding: '8px 0' }}>{emptyText}</div>;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: 'grid', gridTemplateColumns: '1fr 3fr auto', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--tx)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.icon ? it.icon + ' ' : ''}{it.label}</span>
          <div style={{ height: 8, background: 'var(--gr)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: Math.max(3, (it.value / max) * 100) + '%', background: it.color || color, borderRadius: 20, transition: 'width .4s ease' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tx)', minWidth: 26, textAlign: 'right' }}>{it.value}{valueSuffix}</span>
        </div>
      ))}
    </div>
  );
}
