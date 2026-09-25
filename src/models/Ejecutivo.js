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

const AUTH_KEY = 'ps_auth_user';

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
  if (!data.password) data.password = 'Proservis2026';
  // Hierarchy enforcement: only super_admin can create super_admin
  if (data.role === ROLES.SUPER_ADMIN && actor && actor.role !== ROLES.SUPER_ADMIN) {
    throw new Error('Solo Super Admin puede crear Super Admin');
  }
  // Admin cannot assign to a workspace they don't belong to (unless super_admin)
  if (actor && actor.role === ROLES.ADMIN && data.workspaceId && data.workspaceId !== actor.workspaceId) {
    // Allow but warn — admins are scoped to their workspace for visibility, not enforcement
  }
  if (data.id) {
    const e = DB.ejs.find(x => x.id === data.id);
    if (e) {
      if (e.role === ROLES.SUPER_ADMIN && actor && actor.role !== ROLES.SUPER_ADMIN) {
        throw new Error('No puedes modificar un Super Admin');
      }
      Object.assign(e, data);
    }
  } else {
    data.id = 'e' + Date.now();
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

/** Deletes an Ejecutivo by id. */
export function deleteEj(id) {
  DB.ejs = DB.ejs.filter(e => e.id !== id);
  saveDB();
}

/**
 * Local (offline/demo) authentication fallback, used when Firebase auth is
 * unavailable or fails. See `controllers/authController.js` for how this
 * combines with Firebase.
 *
 * Compares against the Ejecutivo's own stored `password` only — there is no
 * wildcard/master password. Passwords are still stored in plain text in
 * `localStorage`, which is acceptable for a local-only demo account but not
 * for real client data; see "Deuda técnica conocida" in
 * docs/ARCHITECTURE.md for the recommended hardening (hashing, or requiring
 * Firebase Authentication instead of this fallback).
 */
export function authenticateLocal(email, password) {
  const u = getUserByEmail(email);
  if (!u) return null;
  if (!u.activo) return null;
  const pwd = (password || '').trim();
  const stored = (u.password || '').trim();
  if (!stored) return null;
  return pwd === stored ? u : null;
}

/** Reads the current session user, re-hydrated against the latest DB record. */
export function getCurrentUser() {
  try {
    const s = localStorage.getItem(AUTH_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s);
    const fresh = DB.ejs.find(u => u.id === parsed.id);
    return fresh ? { ...fresh, _raw: parsed } : parsed;
  } catch (e) { return null; }
}

/** Persists the current session user. */
export function setCurrentUser(user) {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem('ps_ej_activo', user.id);
  } catch (e) { /* storage unavailable */ }
}

/** Clears the current session. */
export function clearCurrentUser() {
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem('ps_ej_activo');
  } catch (e) { /* storage unavailable */ }
}

/** Generic role check. */
export function hasRole(user, roles) {
  if (!user) return false;
  if (!roles || !roles.length) return true;
  return roles.includes(user.role);
}

export function isSuperAdmin(user) { return user?.role === ROLES.SUPER_ADMIN; }
export function isAdmin(user) { return user?.role === ROLES.ADMIN || user?.role === ROLES.SUPER_ADMIN; }
