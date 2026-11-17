/**
 * views/pages/dashboard/utils.js
 * ─────────────────────────────────────────────────────────────────────────
 * Non-component helpers shared by the dashboard's chart primitives and
 * composition components. Kept out of charts.jsx so that file can stay
 * component-only (react-refresh/only-export-components).
 */

/** Semáforo verde/ámbar/rojo por umbral de porcentaje — usado en toda la vista. */
export function statusColor(pct) {
  return pct >= 80 ? '#168A43' : pct >= 50 ? '#E8BB26' : '#C0392B';
}

/**
 * Cuánto avance es "normal" a esta altura del mes (0-100). Un mes ya cerrado
 * debe estar completo; el mes en curso, proporcional al día. Así el día 4 nadie
 * sale "atrasado" por tener 0 %.
 */
export function esperadoPct(per, hoy = new Date()) {
  const [y, m] = String(per).split('-').map(Number);
  const actual = hoy.getFullYear() * 12 + hoy.getMonth();
  const pedido = y * 12 + (m - 1);
  if (pedido < actual) return 100;
  if (pedido > actual) return 0;
  const dias = new Date(y, m, 0).getDate();
  return Math.round((hoy.getDate() / dias) * 100);
}

/** ¿Va atrasada la persona? Más de 20 puntos por debajo de lo esperado para la fecha. */
export function vaAtrasada(pct, esperado) {
  return pct < esperado - 20;
}

/** Semáforo relativo a lo esperado: verde si va al día, ámbar si va algo corto, rojo si está atrasada. */
export function statusColorRel(pct, esperado) {
  if (pct >= esperado - 5) return '#168A43';
  return vaAtrasada(pct, esperado) ? '#C0392B' : '#E8BB26';
}
