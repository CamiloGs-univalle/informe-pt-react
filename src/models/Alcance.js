/**
 * models/Alcance.js
 * ─────────────────────────────────────────────────────────────────────────
 * "¿Qué le toca ver y hacer a cada persona?" — fuente única de verdad para
 * menú, rutas, dashboard y listados. Antes cada pantalla decidía por su
 * cuenta (y varias mostraban los datos de TODA la empresa a cualquier rol).
 *
 * Conceptos (ver docs/MODEL.md):
 *  - Ejecutivo líder: lidera el informe final de uno o más clientes
 *    (`cliente.ejId === persona.id`) o pertenece a un área marcada como
 *    líder (`area.lidera`, o —en datos antiguos sin ese campo— cuyo nombre
 *    sea de Atención al Cliente / Ejecutivos).
 *  - Trabajador de área: aporta su parte (Selección, SST, Bienestar…) en
 *    los clientes donde está en `cliente.asignaciones`.
 *  - Admin: supervisa a su equipo (`getUsersForAdmin`).
 *  - Super Admin: ve y administra todo.
 */
import { DB } from './db';
import { getUsersForAdmin } from './Ejecutivo';
import { areaAplica } from './ModuloConfig';

const AREA_LIDER_RE = /atenci[oó]n|ejecutiv/i;

export function areaEsLider(area) {
  if (!area) return false;
  if (typeof area.lidera === 'boolean') return area.lidera;
  return AREA_LIDER_RE.test(area.nombre || '');
}

/** ¿Lidera informes finales de algún cliente (o su área lo hace)? */
export function esLider(user) {
  if (!user) return false;
  if (DB.clis.some(c => c.ejId === user.id)) return true;
  return areaEsLider(DB.areas.find(a => a.id === user.areaId));
}

/** ¿Tiene un área con módulos propios donde aportar? */
export function tieneAreaOperativa(user) {
  const area = DB.areas.find(a => a.id === user?.areaId);
  return !!(area && (area.modulos || []).length);
}

/** Ids de las personas que supervisa un admin (incluido él mismo). */
export function equipoIds(user) {
  if (!user) return new Set();
  if (user.role === 'super_admin') return new Set(DB.ejs.map(e => e.id));
  if (user.role === 'admin') return new Set([user.id, ...getUsersForAdmin(user.id).map(u => u.id)]);
  return new Set([user.id]);
}

/** Clientes sobre los que la persona tiene algo que hacer o ver. */
export function clientesDe(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return DB.clis;
  const ids = equipoIds(user);
  const asignado = c => Object.values(c.asignaciones || {}).some(id => ids.has(id));
  return DB.clis.filter(c => ids.has(c.ejId) || asignado(c));
}

/** Clientes cuyo informe final lidera la persona (o todos, si es super admin). */
export function clientesQueLidera(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return DB.clis;
  const ids = equipoIds(user);
  return DB.clis.filter(c => ids.has(c.ejId));
}

/** Informes que la persona puede ver: los de los clientes que lidera (su equipo, si es admin). */
export function informesDe(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return DB.infs;
  const cliIds = new Set(clientesQueLidera(user).map(c => c.id));
  const ids = equipoIds(user);
  return DB.infs.filter(i => cliIds.has(i.cliId) || ids.has(i.ejId));
}

/** ¿Puede borrar/calificar este informe? Dueño, admin del equipo o super admin. */
export function puedeGestionarInforme(user, inf) {
  if (!user || !inf) return false;
  if (user.role === 'super_admin') return true;
  return equipoIds(user).has(inf.ejId) || clientesQueLidera(user).some(c => c.id === inf.cliId);
}

/** ¿Puede aprobar este informe para que se envíe al cliente? Solo administradores (de su equipo) y super admin. */
export function puedeAprobarInforme(user, inf) {
  if (!user || !inf) return false;
  if (user.role !== 'admin' && user.role !== 'super_admin') return false;
  return puedeGestionarInforme(user, inf);
}

/**
 * Capacidades de la persona → qué entradas de menú y rutas se le muestran.
 * Las claves son las mismas que usa `MENU` en Layout y `RequireCap` en rutas.
 */
export function capacidades(user) {
  const sa = user?.role === 'super_admin';
  const admin = user?.role === 'admin' || sa;
  const lider = admin || esLider(user);
  return {
    dashboard: true,
    clientes: admin || lider || clientesDe(user).length > 0,
    colaborativo: lider,
    contribuciones: admin || tieneAreaOperativa(user) || clientesDe(user).length > 0,
    nuevo: lider,
    config: lider || areasDeAporte(user).length > 0,
    guardados: lider,
    equipo: admin,
    aclientes: admin,
    aejecutivos: admin,
    espacios: sa,
    admindata: sa,
    esLider: lider,
    esAdmin: admin,
    esSuperAdmin: sa,
  };
}

/** Áreas donde la persona puede aportar datos (con módulos propios). */
export function areasDeAporte(user) {
  if (!user) return [];
  const conModulos = DB.areas.filter(a => (a.modulos || []).length);
  if (user.role === 'super_admin') return conModulos;
  const ids = new Set();
  DB.clis.forEach(c => Object.entries(c.asignaciones || {}).forEach(([areaId, uid]) => { if (uid === user.id) ids.add(areaId); }));
  if (user.areaId) ids.add(user.areaId);
  if (user.role === 'admin') DB.areas.filter(a => a.adminId === user.id).forEach(a => ids.add(a.id));
  return conModulos.filter(a => ids.has(a.id));
}

/**
 * Tareas de aporte de la persona: pares cliente × área donde le toca subir su
 * parte. Un trabajador solo ve lo que tiene asignado; un admin, además, lo de
 * las áreas que administra; el super admin elige el área (`areaId`) y ve todos
 * los clientes.
 */
export function tareasDe(user, areaId = null) {
  if (!user) return [];
  const out = [];
  const add = (cli, area) => { if (cli && area && areaAplica(cli, area) && !out.some(t => t.cli.id === cli.id && t.area.id === area.id)) out.push({ cli, area }); };
  const areas = DB.areas.filter(a => (a.modulos || []).length);
  if (user.role === 'super_admin') {
    const area = areas.find(a => a.id === areaId) || areas[0];
    DB.clis.forEach(c => add(c, area));
    return out;
  }
  DB.clis.forEach(c => Object.entries(c.asignaciones || {}).forEach(([aid, uid]) => {
    if (uid === user.id) add(c, areas.find(a => a.id === aid));
  }));
  if (user.role === 'admin') {
    const mias = areas.filter(a => a.adminId === user.id);
    clientesDe(user).forEach(c => mias.forEach(a => add(c, a)));
  }
  if (!out.length && user.areaId && !['admin'].includes(user.role)) {
    // Sin asignaciones explícitas: no se inventan tareas (evita ver clientes ajenos).
    return [];
  }
  return out;
}
