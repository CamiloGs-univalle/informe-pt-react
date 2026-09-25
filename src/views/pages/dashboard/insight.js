/**
 * views/pages/dashboard/insight.js
 * ─────────────────────────────────────────────────────────────────────────
 * Decide el mensaje único (y su color de estado) que InsightBanner muestra,
 * priorizando señales de calidad (feedback de cliente) y avance del equipo
 * sobre las demás. Vive fuera de InsightBanner.jsx para que ese archivo se
 * quede solo con el componente (react-refresh/only-export-components).
 */
export function computeInsight({ role, kpis, team, lowRated }) {
  if ((role === 'super_admin' || role === 'admin') && team) {
    if (lowRated && lowRated.length >= 2) {
      return { tone: 'bad', text: lowRated.length + ' informes recientes quedaron con 3★ o menos — revísalos antes de la próxima entrega.' };
    }
    const behind = team.filter(p => p.total > 0 && p.pct < 50).length;
    if (behind > 0) {
      return { tone: 'bad', text: behind + ' persona' + (behind !== 1 ? 's' : '') + ' del equipo va' + (behind !== 1 ? 'n' : '') + ' por debajo del 50% de avance este mes.' };
    }
    const pendTotal = team.reduce((s, p) => s + p.pend, 0);
    if (pendTotal > 0) {
      return { tone: 'warn', text: pendTotal + ' informe' + (pendTotal !== 1 ? 's' : '') + ' pendiente' + (pendTotal !== 1 ? 's' : '') + ' en el equipo este mes.' };
    }
    return { tone: 'good', text: 'Todo el equipo está al día con sus informes de este mes.' };
  }
  // usuario
  if (lowRated && lowRated.length > 0) {
    return { tone: 'warn', text: lowRated.length + ' de tus informes recientes quedaron con calificación baja — revisa el feedback antes de la próxima entrega.' };
  }
  if (kpis.cli === 0) {
    return { tone: 'warn', text: 'Todavía no tienes clientes asignados — contacta a un administrador.' };
  }
  if (kpis.pend > 0) {
    return { tone: 'warn', text: 'Tienes ' + kpis.pend + ' cliente' + (kpis.pend !== 1 ? 's' : '') + ' sin informe este mes.' };
  }
  return { tone: 'good', text: '¡Vas al día! Todos tus clientes tienen informe este mes.' };
}
