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

/** Un solo mensaje, priorizado, para que el trabajador sepa qué mirar primero. */
export function computeWorkerInsight(stats) {
  if (stats.rechazadasActivas.length > 0) {
    const n = stats.rechazadasActivas.length;
    return { tone: 'bad', text: `Tienes ${n} contribución${n !== 1 ? 'es' : ''} con correcciones pedidas por tu Ejecutivo — revísala${n !== 1 ? 's' : ''} abajo.` };
  }
  if (stats.pendientesPeriodo > 0) {
    return { tone: 'warn', text: `Te falta${stats.pendientesPeriodo !== 1 ? 'n' : ''} ${stats.pendientesPeriodo} cliente${stats.pendientesPeriodo !== 1 ? 's' : ''} por reportar este período.` };
  }
  if (stats.qualityPct !== null && stats.qualityPct < 70) {
    return { tone: 'warn', text: `Tu tasa de aprobación a la primera es ${stats.qualityPct}% — revisa bien antes de marcar completado.` };
  }
  if (stats.qualityPct !== null && stats.qualityPct >= 90) {
    return { tone: 'good', text: `Excelente trabajo — ${stats.qualityPct}% de tus contribuciones pasan validación a la primera.` };
  }
  return { tone: 'good', text: '¡Vas al día! No tienes pendientes para este período.' };
}
