/**
 * models/Contribucion.js
 * ─────────────────────────────────────────────────────────────────────────
 * Contribución colaborativa por área x cliente x periodo.
 * Cada área (Selección, SST, etc.) sube su parte; el Ejecutivo fusiona todo.
 *
 * Estados: pendiente | en_proceso | completado | validado | rechazado
 */
import { DB, saveDB } from './db';

export const ESTADOS = {
  PENDIENTE: 'pendiente',
  EN_PROCESO: 'en_proceso',
  COMPLETADO: 'completado',
  VALIDADO: 'validado',
  RECHAZADO: 'rechazado',
};

/**
 * Metadatos visuales de cada estado (icono, texto, color) — una sola fuente
 * para que el Tablero colaborativo, Mis contribuciones y cualquier vista
 * futura pinten el semáforo exactamente igual.
 */
export const ESTADO_META = {
  [ESTADOS.PENDIENTE]: { icon: '⭕', label: 'Sin iniciar', color: '#9AA6A0', bg: '#F2F4F2' },
  [ESTADOS.EN_PROCESO]: { icon: '✍️', label: 'En proceso', color: '#2196F3', bg: '#E3F2FD' },
  [ESTADOS.COMPLETADO]: { icon: '📤', label: 'Por validar', color: '#E8BB26', bg: '#FDF6D8' },
  [ESTADOS.VALIDADO]: { icon: '✅', label: 'Validado', color: '#168A43', bg: '#E8F5EE' },
  [ESTADOS.RECHAZADO]: { icon: '↩️', label: 'Con correcciones', color: '#C0392B', bg: '#FDF0EE' },
};


/** Busca contribución por cliente/periodo/área */
export function getContribucion(cliId, per, areaId) {
  return DB.contribuciones.find(c => c.cliId === cliId && c.per === per && c.areaId === areaId) || null;
}

/** Todas las contribuciones de un cliente/periodo */
export function getContribucionesForClientePeriodo(cliId, per) {
  return DB.contribuciones.filter(c => c.cliId === cliId && c.per === per);
}

/** Todas las contribuciones asignadas a un usuario (por área) */
export function getContribucionesForUser(userId) {
  return DB.contribuciones.filter(c => c.userId === userId);
}

/** Contribuciones por área (para jefe de área) */
export function getContribucionesForArea(areaId) {
  return DB.contribuciones.filter(c => c.areaId === areaId);
}

/** Crea o actualiza una contribución */
export function saveContribucion({ cliId, per, areaId, userId, estado = ESTADOS.EN_PROCESO, datos = {}, obs = '' }) {
  let c = getContribucion(cliId, per, areaId);
  const now = new Date().toISOString();
  if (c) {
    Object.assign(c, { userId: userId || c.userId, estado, datos, obs, updatedAt: now });
  } else {
    c = {
      id: `ct_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      cliId, per, areaId, userId,
      estado, datos, obs,
      createdAt: now, updatedAt: now,
    };
    DB.contribuciones.push(c);
  }
  saveDB();
  return c;
}

/** Marca como completado por el worker */
export function completarContribucion(cliId, per, areaId) {
  const c = getContribucion(cliId, per, areaId);
  if (c) { c.estado = ESTADOS.COMPLETADO; c.updatedAt = new Date().toISOString(); saveDB(); }
  return c;
}

/**
 * Validado/rechazado por ejecutivo o admin. Cada rechazo suma a
 * `rechazosCount`, que es la base de la métrica de calidad que ve el
 * trabajador en "Mis contribuciones" (aprobación a la primera vs. con
 * correcciones) — sin este contador esa señal se perdía en cuanto se
 * volvía a subir y cambiaba de estado.
 */
export function validarContribucion(cliId, per, areaId, validado = true, obs = '') {
  const c = getContribucion(cliId, per, areaId);
  if (c) {
    c.estado = validado ? ESTADOS.VALIDADO : ESTADOS.RECHAZADO;
    if (!validado) c.rechazosCount = (c.rechazosCount || 0) + 1;
    if (obs) c.obs = obs;
    c.updatedAt = new Date().toISOString();
    saveDB();
  }
  return c;
}

/** Inicializa contribuciones pendientes para un cliente/periodo según áreas activas */
export function initContribucionesForPeriodo(cliId, per, areaIds) {
  areaIds.forEach(areaId => {
    if (!getContribucion(cliId, per, areaId)) {
      saveContribucion({ cliId, per, areaId, userId: null, estado: ESTADOS.PENDIENTE, datos: {} });
    }
  });
}

/** Borra contribuciones de un cliente/periodo (reset) */
export function deleteContribucionesForPeriodo(cliId, per) {
  DB.contribuciones = DB.contribuciones.filter(c => !(c.cliId === cliId && c.per === per));
  saveDB();
}

/** Resumen de estados por cliente/periodo para el ejecutivo */
export function getResumenEstados(cliId, per) {
  const list = getContribucionesForClientePeriodo(cliId, per);
  const byArea = {};
  list.forEach(c => { byArea[c.areaId] = c.estado; });
  const total = list.length;
  const completadas = list.filter(c => c.estado === ESTADOS.COMPLETADO || c.estado === ESTADOS.VALIDADO).length;
  const pendientes = list.filter(c => c.estado === ESTADOS.PENDIENTE).length;
  const enProceso = list.filter(c => c.estado === ESTADOS.EN_PROCESO).length;
  const pct = total ? Math.round(completadas / total * 100) : 0;
  return { byArea, total, completadas, pendientes, enProceso, pct, list };
}
