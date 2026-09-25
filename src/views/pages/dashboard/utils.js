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
