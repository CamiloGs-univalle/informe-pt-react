/**
 * views/pages/equipo/helpers.js
 * ─────────────────────────────────────────────────────────────────────────
 * Funciones puras (sin React) para la vista "Mi equipo": ícono por área,
 * última actividad y calidad promedio por persona, y la tendencia de los
 * últimos 4 meses (misma cuenta que ya usa `dashboard/TeamGrid.jsx`, pero
 * expuesta aquí para no acoplar ambas vistas entre sí).
 */

/** Color de acento por rol — mismo criterio que usa el resto de la app
 * (super_admin navy, admin azul, usuario verde) para que el punto de color
 * de la persona sea reconocible en cualquier vista. */
export const ROLE_COLOR = { super_admin: '#12212D', admin: '#1A5276', usuario: '#168A43' };

/** Ícono representativo por nombre de área (heurística simple por palabra clave). */
export function areaIcon(nombre = '') {
  const n = nombre.toLowerCase();
  if (n.includes('selecc')) return '🧩';
  if (n.includes('sst')) return '🦺';
  if (n.includes('atenci') || n.includes('ejecutivo')) return '🤝';
  if (n.includes('bienestar') || n.includes('clima')) return '🌱';
  if (n.includes('operacion')) return '⚙️';
  return '🏢';
}

/** ISO timestamp del informe más reciente de un ejecutivo, o null si nunca generó uno. */
export function lastActivityTs(ejId, infs) {
  let latest = null;
  for (const i of infs) {
    if (i.ejId !== ejId || !i.ts) continue;
    if (!latest || i.ts > latest) latest = i.ts;
  }
  return latest;
}

/** Calificación promedio (1-5) de los informes calificados de un ejecutivo, o null si ninguno tiene calificación aún. */
export function avgQuality(ejId, infs) {
  const rated = infs.filter(i => i.ejId === ejId && i.rating);
  if (!rated.length) return null;
  return rated.reduce((s, i) => s + i.rating, 0) / rated.length;
}

/** Cantidad de informes por mes en los últimos 4 meses (para el mini-sparkline de cada tarjeta). */
export function last4MonthsTrend(infsUser) {
  const out = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const per = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    out.push(infsUser.filter(x => x.per === per).length);
  }
  return out;
}
