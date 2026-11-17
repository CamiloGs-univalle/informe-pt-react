/**
 * views/pages/dashboard/insight.js
 * ─────────────────────────────────────────────────────────────────────────
 * Decide el mensaje único (y su color de estado) que muestra InsightBanner,
 * priorizando por urgencia. Vive fuera del componente para que
 * InsightBanner.jsx solo exporte el componente (react-refresh).
 */
import { plural } from '../../../utils/format';
import { vaAtrasada } from './utils';

/** Mensaje para quien lidera informes (ejecutivo, admin o super admin). */
export function computeInsight({ kpis, team, lowRated, esEquipo, esperado = 100 }) {
  if (esEquipo && lowRated.length >= 2) {
    return { tone: 'bad', text: `${plural(lowRated.length, 'informe reciente', 'informes recientes')} quedaron con 3★ o menos. Revísalos antes de la próxima entrega.`, to: '/guardados', cta: 'Ver informes' };
  }
  if (kpis.porValidar > 0) {
    return { tone: 'warn', text: `${plural(kpis.porValidar, 'aporte')} del equipo esperan tu validación.`, to: '/colaborativo', cta: 'Ir al tablero' };
  }
  if (esEquipo && team) {
    const atrasados = team.filter(p => p.total > 0 && vaAtrasada(p.pct, esperado)).length;
    if (atrasados > 0) {
      return { tone: 'bad', text: `${plural(atrasados, 'persona')} del equipo ${atrasados === 1 ? 'va' : 'van'} atrasada${atrasados === 1 ? '' : 's'} para esta altura del mes.`, to: '/equipo', cta: 'Ver equipo' };
    }
  }
  if (esEquipo && team) {
    const entregas = team.reduce((s, p) => s + p.pend, 0);
    if (entregas > 0) return { tone: 'warn', text: `${plural(entregas, 'entrega pendiente', 'entregas pendientes')} en el equipo.`, to: '/equipo', cta: 'Ver equipo' };
  }
  if (kpis.cli === 0) {
    return { tone: 'warn', text: 'Todavía no tienes clientes asignados. Pídele a tu administrador que te los asigne.' };
  }
  if (kpis.pend > 0) {
    return { tone: 'warn', text: `${plural(kpis.pend, 'cliente')} sin informe en este período.`, to: '/nuevo', cta: 'Crear informe' };
  }
  return { tone: 'good', text: 'Todo al día: cada cliente tiene su informe de este período.' };
}
