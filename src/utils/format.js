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

// ── Números y textos en formato es-CO (punto de mil, coma decimal) ─────────
const NF_INT = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const NF_DEC = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const NF_MONEY = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 1234567 → "1.234.567". Acepta null/undefined/'' → "—". */
export function fmtNum(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—';
  return NF_INT.format(Number(n));
}

/** 4.25 → "4,3" (un decimal, coma decimal). */
export function fmtDec(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—';
  return NF_DEC.format(Number(n));
}

/** 1500000 → "$ 1.500.000". */
export function fmtMoney(n) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '—';
  return NF_MONEY.format(Number(n));
}

/** 0.256 → "25,6 %" no; se usa entero: 26 → "26 %". */
export function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return NF_INT.format(Math.round(Number(n))) + ' %';
}

/** "890306215" → "890.306.215". Conserva dígito de verificación si viene con guion. */
export function fmtNit(nit) {
  if (!nit) return '—';
  const [base, dv] = String(nit).replace(/\./g, '').split('-');
  const digits = base.replace(/\D/g, '');
  if (!digits) return String(nit);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dv ? '-' + dv : '');
}

/** plural(1, 'informe') → "1 informe"; plural(2, 'informe') → "2 informes"; plural(3, 'área', 'áreas'). */
export function plural(n, singular, pluralForm) {
  const num = Number(n) || 0;
  const word = num === 1 ? singular : (pluralForm || singular + 's');
  return `${fmtNum(num)} ${word}`;
}

/** ISO → "15/09/2026". */
export function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** ISO → "15/09/2026, 2:00 p. m.". */
export function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return fmtFecha(iso) + ', ' + d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}

/** Periodo actual en formato YYYY-MM (hora local, no UTC). */
export function periodoActual(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

/** Iniciales para avatares: "Camilo García" → "CG"; "4 PAJAROS S.A.S." → "4P". */
export function iniciales(nombre, n = 2) {
  const words = String(nombre || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, n).toUpperCase();
  return words.slice(0, n).map(w => w[0]).join('').toUpperCase();
}
