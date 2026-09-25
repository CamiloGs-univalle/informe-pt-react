/**
 * utils/format.js
 * ─────────────────────────────────────────────────────────────────────────
 * Pure, stateless formatting helpers shared by several views. No React,
 * no persistence — safe to unit-test in isolation.
 */

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** Formats a `YYYY-MM` period as `"Ene 2026"`. */
export function fmtPer(p) {
  if (!p) return '—';
  const pts = p.split('-');
  return MESES_CORTOS[+pts[1] - 1] + ' ' + pts[0];
}

/** Formats a `YYYY-MM` period as `"Enero 2026"`. */
export function fmtPerLong(p) {
  if (!p) return '—';
  const pts = p.split('-');
  return MESES_LARGOS[+pts[1] - 1] + ' ' + pts[0];
}

/** Formats a byte count as a human-readable size (`"12KB"`, `"1.3MB"`). */
export function fmtSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

/**
 * Formats an ISO timestamp as relative time in Spanish (`"hace 5 min"`,
 * `"hace 2 h"`, `"ayer"`, `"hace 6 días"`) — used by the collaborative
 * board to give updates a "someone just worked on this" feel without
 * making the person do date math.
 */
export function timeAgo(iso) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  if (diffMs < 0) return 'justo ahora';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'justo ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const sem = Math.floor(d / 7);
  if (sem < 5) return `hace ${sem} semana${sem !== 1 ? 's' : ''}`;
  const mes = Math.floor(d / 30);
  if (mes < 12) return `hace ${mes} mes${mes !== 1 ? 'es' : ''}`;
  return `hace ${Math.floor(d / 365)} año${Math.floor(d / 365) !== 1 ? 's' : ''}`;
}
