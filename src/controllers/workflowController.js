/**
 * controllers/workflowController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Orquesta el flujo colaborativo: quién puede ver/editar qué, y el estado
 * semáforo que ve el Ejecutivo.
 */
import { DB } from '../models/db';
import { getContribucionesForClientePeriodo, getResumenEstados, ESTADOS } from '../models/Contribucion';
import { getCli } from '../models/Cliente';

export function getAreas() {
  return DB.areas;
}

export function getArea(areaId) {
  return DB.areas.find(a => a.id === areaId) || null;
}

export function getModulosDelArea(areaId) {
  const a = getArea(areaId);
  return a?.modulos || [];
}

/** ¿User puede editar esta área para este cliente? */
export function puedeEditar(user, cliId, areaId) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const cli = getCli(cliId);
  if (!cli) return false;
  // Ejecutivo líder puede editar todo de sus clientes
  if (cli.ejId === user.id) return true;
  // Admin de área puede editar su área
  const area = getArea(areaId);
  if (user.role === 'admin' && area?.adminId === user.id) return true;
  // Worker asignado a esa área+cliente
  if (cli.asignaciones && cli.asignaciones[areaId] === user.id) return true;
  // Si el user pertenece al área y no hay asignación explícita, permitir si el área es su areaId
  if (user.areaId === areaId) return true;
  return false;
}

/** ¿User puede ver el informe completo del cliente? (solo ejecutivo, admin, super_admin) */
export function puedeVerInformeCompleto(user, cliId) {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'admin') return true;
  const cli = getCli(cliId);
  return cli?.ejId === user.id;
}

/** Clientes que le toca a un usuario según su rol/área */
export function getClientesParaUsuario(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return DB.clis;
  if (user.role === 'admin') {
    // Admin ve clientes que tienen contribuciones de su área o asignaciones
    const areaIds = DB.areas.filter(a => a.adminId === user.id).map(a => a.id);
    if (!areaIds.length) return DB.clis.filter(c => c.ejId === user.id);
    return DB.clis.filter(c => areaIds.some(aid => c.asignaciones?.[aid] === user.id || c.ejId === user.id) || user.areaId && areaIds.includes(user.areaId));
  }
  // usuario normal: por ejId o por asignaciones
  return DB.clis.filter(c => c.ejId === user.id || Object.values(c.asignaciones || {}).includes(user.id) || c.asignaciones?.[user.areaId] === user.id);
}

/** Resumen para tablero ejecutivo: por periodo, qué clientes tienen qué pendiente */
export function getTableroEjecutivo(userId, per) {
  const cliIds = getClientesParaUsuario({ id: userId, role: 'usuario' }).map(c => c.id);
  // Si es ejecutivo, solo sus clientes
  const clis = DB.clis.filter(c => c.ejId === userId || (DB.ejs.find(e => e.id===userId)?.role !== 'usuario' && cliIds.includes(c.id)));
  return clis.map(cli => {
    const resumen = getResumenEstados(cli.id, per);
    const areas = DB.areas.filter(a => (a.modulos||[]).length);
    const detalle = areas.map(a => {
      const contrib = resumen.list.find(x => x.areaId === a.id);
      return { areaId: a.id, nombre: a.nombre, color: a.color, estado: contrib?.estado || ESTADOS.PENDIENTE, modulos: a.modulos };
    });
    return { cli, resumen, detalle };
  });
}

/** Fusiona datos de contribuciones en un objeto listo para buildInformeHTML */
export function fusionarContribuciones(cliId, per) {
  const contribs = getContribucionesForClientePeriodo(cliId, per);
  let seleccion = [], rotacion = [], sst = { indicadores: {}, casos: [] }, nomina = {}, headcount = { inicio:0, ingresos:0, retiros:0 }, ausentismo={}, fotos={}, capacitacion={}, clima={}, facturacion={};
  contribs.forEach(ct => {
    const d = ct.datos || {};
    if (d.seleccion) seleccion = d.seleccion;
    if (d.rotacion) rotacion = d.rotacion;
    if (d.sst) sst = d.sst;
    if (d.nomina) nomina = d.nomina;
    if (d.headcount) headcount = d.headcount;
    if (d.ausentismo) ausentismo = d.ausentismo;
    if (d.fotos) fotos = { ...fotos, ...d.fotos };
    if (d.capacitacion) capacitacion = d.capacitacion;
    if (d.clima) clima = d.clima;
    if (d.facturacion) facturacion = d.facturacion;
  });
  return { seleccion, rotacion, sst, nomina, headcount, ausentismo, fotos, capacitacion, clima, facturacion };
}
