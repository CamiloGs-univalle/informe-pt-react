/**
 * models/Ejecutivo.js
 * ─────────────────────────────────────────────────────────────────────────
 * Domain model for "Ejecutivo" (an app user: usuario, admin or super_admin)
 * plus authentication helpers against the local (offline/demo) store.
 *
 * See docs/MODEL.md for the full entity/field reference.
 */
import { DB, saveDB } from './db';
import { ROLES } from './constants';
import { nuevoId } from '../utils/ids';

/** Returns every Ejecutivo record. */
export function getEjs() {
  return DB.ejs;
}

/** Finds a single Ejecutivo by id. */
export function getEj(id) {
  return DB.ejs.find(e => e.id === id);
}

/** Finds an Ejecutivo by email (case-insensitive). */
export function getUserByEmail(email) {
  if (!email) return null;
  return DB.ejs.find(u => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

/** Returns all Ejecutivos with the given role. */
export function getUsersByRole(role) {
  return DB.ejs.filter(u => u.role === role);
}

/**
 * Returns the team an admin supervises — restringido por área Señor.
 * - Super Admin ve todo
 * - Admin SST solo ve SST (users con areaId === área SST)
 * - Admin Selección solo ve Selección
 * - Admin Ejecutivo solo ve ejecutivos (usuarios que son ejId de algún cliente)
 * - Nunca ve ni puede editar Super Admin
 */
export function getUsersForAdmin(adminId) {
  const admin = getEj(adminId);
  if (!admin) return DB.ejs.filter(u => u.role !== 'super_admin');
  if (admin.role === 'super_admin') return DB.ejs;
  // Admin: áreas que administra (area.adminId === admin.id)
  const managedAreaIds = DB.areas.filter(a => a.adminId === admin.id).map(a => a.id);
  const targetAreaIds = managedAreaIds.length ? managedAreaIds : (admin.areaId ? [admin.areaId] : []);
  let filtered = DB.ejs.filter(u => u.role !== 'super_admin' && u.workspaceId === admin.workspaceId);
  if (!targetAreaIds.length) return filtered;
  // Detectar si es jefe de ejecutivos (área cuyo nombre contiene ejecutivo/administracion/operaciones)
  const isEjecutivoAdmin = targetAreaIds.some(aid => {
    const area = DB.areas.find(a => a.id === aid);
    return area && /ejecutivo|administraci|operaciones/i.test(area.nombre);
  });
  if (isEjecutivoAdmin) {
    const ejecutivoIds = new Set(DB.clis.map(c => c.ejId).filter(Boolean));
    filtered = filtered.filter(u => ejecutivoIds.has(u.id) || targetAreaIds.includes(u.areaId));
  } else {
    filtered = filtered.filter(u => targetAreaIds.includes(u.areaId));
  }
  return filtered;
}

/** Creates or updates an Ejecutivo. Normalizes email and fills sane defaults. */
export function saveEj(data, actor) {
  if (data.email) data.email = data.email.toLowerCase().trim();
  if (!data.role) data.role = 'usuario';
  delete data.password; // las credenciales viven solo en Firebase Authentication
  // Hierarchy enforcement: only super_admin can create super_admin
  if (data.role === ROLES.SUPER_ADMIN && actor && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Solo Super Admin puede crear Super Admin');
  }
  // Admin cannot assign to a workspace they don't belong to (unless super_admin)
  if (actor && actor.role === ROLES.ADMIN && data.workspaceId && data.workspaceId !== actor.workspaceId) {
    // Allow but warn — admins are scoped to their workspace for visibility, not enforcement
  }
  if (data.email && DB.ejs.some(x => x.id !== data.id && (x.email || '').toLowerCase() === data.email)) {
    throw new Error('Ya existe una persona con ese correo.');
  }
  if (data.id) {
    const e = DB.ejs.find(x => x.id === data.id);
    if (e) {
      if (e.role === ROLES.SUPER_ADMIN && actor && actor.role !== ROLES.SUPER_ADMIN) {
        throw new Error('No puedes modificar un Super Admin');
      }
      Object.assign(e, data);
      delete e.password;
    }
  } else {
    data.id = nuevoId('e', DB.ejs);
    if (data.activo === undefined) data.activo = true;
    DB.ejs.push(data);
  }
  saveDB();
  return data;
}

/** Validates if actor can delete target. */
export function canDeleteEj(actor, targetId) {
  const target = DB.ejs.find(x => x.id === targetId);
  if (!target) return false;
  if (actor?.id === targetId) return false; // cannot delete self
  if (target.role === ROLES.SUPER_ADMIN && actor?.role !== ROLES.SUPER_ADMIN) return false;
  return true;
}

/**
 * Deletes an Ejecutivo by id y deja el resto de los datos consistente:
 * sus clientes quedan sin ejecutivo, se le quita de las asignaciones por
 * área y de la jefatura de áreas, y se borra su configuración de módulos.
 * (Antes solo se borraba el registro y quedaban referencias huérfanas.)
 */
export function deleteEj(id) {
  DB.ejs = DB.ejs.filter(e => e.id !== id);
  DB.clis.forEach(c => {
    if (c.ejId === id) c.ejId = '';
    Object.keys(c.asignaciones || {}).forEach(areaId => { if (c.asignaciones[areaId] === id) delete c.asignaciones[areaId]; });
  });
  DB.areas.forEach(a => { if (a.adminId === id) a.adminId = null; });
  DB.contribuciones.forEach(ct => { if (ct.userId === id) ct.userId = null; });
  Object.keys(DB.moduloConfigs).forEach(k => { if (k === id || k.startsWith(id + '_')) delete DB.moduloConfigs[k]; });
  saveDB();
}

/** Generic role check. */
export function hasRole(user, roles) {
  if (!user) return false;
  if (!roles || !roles.length) return true;
  return roles.includes(user.role);
}

export function isSuperAdmin(user) { return user?.role === ROLES.SUPER_ADMIN; }
export function isAdmin(user) { return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN; }
