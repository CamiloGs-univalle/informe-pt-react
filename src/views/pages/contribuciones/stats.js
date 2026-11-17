/**
 * views/pages/contribuciones/stats.js
 * ─────────────────────────────────────────────────────────────────────────
 * Métricas de desempeño del trabajador a partir de su propio historial de
 * contribuciones: cuánto tiene pendiente ahora, y qué tan seguido su
 * trabajo pasa la validación del Ejecutivo sin necesitar correcciones —
 * la señal de calidad más honesta que hay, porque la pone quien revisa el
 * trabajo, no quien lo sube. Vive fuera de los componentes para no romper
 * react-refresh/only-export-components.
 */
import { ESTADOS } from '../../../models/Contribucion';
import { plural } from '../../../utils/format';

export function computeStats(contribs, periodoActual) {
  const delPeriodo = contribs.filter(c => c.per === periodoActual);
  const completadasPeriodo = delPeriodo.filter(c => c.estado === ESTADOS.COMPLETADO || c.estado === ESTADOS.VALIDADO).length;
  const pendientesPeriodo = delPeriodo.filter(c => c.estado === ESTADOS.PENDIENTE || c.estado === ESTADOS.EN_PROCESO).length;

  const validadas = contribs.filter(c => c.estado === ESTADOS.VALIDADO);
  const primeraVez = validadas.filter(c => !c.rechazosCount).length;
  const qualityPct = validadas.length ? Math.round((primeraVez / validadas.length) * 100) : null;

  const rechazadasActivas = contribs
    .filter(c => c.estado === ESTADOS.RECHAZADO)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  const rechazosHistorico = contribs.reduce((s, c) => s + (c.rechazosCount || 0), 0);

  return {
    completadasPeriodo,
    pendientesPeriodo,
    qualityPct,
    primeraVez,
    validadasHistorico: validadas.length,
    rechazosHistorico,
    rechazadasActivas,
  };
}

/** Un solo mensaje, priorizado, para que la persona sepa qué mirar primero. */
export function computeWorkerInsight(stats) {
  const n = stats.rechazadasActivas.length;
  if (n > 0) return { tone: 'bad', text: `Tienes ${plural(n, 'aporte')} con correcciones pedidas por tu ejecutivo.` };
  if (stats.pendientesPeriodo > 0) return { tone: 'warn', text: `${stats.pendientesPeriodo === 1 ? 'Te falta' : 'Te faltan'} ${plural(stats.pendientesPeriodo, 'cliente')} por reportar en este período.` };
  if (stats.qualityPct !== null && stats.qualityPct < 70) return { tone: 'warn', text: `Solo el ${stats.qualityPct}% de tus aportes pasa a la primera: revisa bien antes de enviar.` };
  if (stats.qualityPct !== null && stats.qualityPct >= 90) return { tone: 'good', text: `Excelente: el ${stats.qualityPct}% de tus aportes pasa validación a la primera.` };
  return { tone: 'good', text: 'Vas al día: no tienes pendientes en este período.' };
}
