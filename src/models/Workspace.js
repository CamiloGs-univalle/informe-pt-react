/**
 * models/Workspace.js
 * ─────────────────────────────────────────────────────────────────────────
 * Domain model for "Workspace" (espacio, e.g. "Proservis Temporales") and
 * "Area" (área dentro de un espacio, e.g. "Nómina"). Managed exclusively by
 * super_admin users. Hierarchy: Workspace → Area → Ejecutivo.
 *
 * See docs/MODEL.md for the full entity/field reference.
 */
import { DB, saveDB } from './db';

// ── Workspaces ───────────────────────────────────────────────────────────

export function getWorkspaces() {
  return DB.workspaces;
}

export function getWorkspace(id) {
  return DB.workspaces.find(w => w.id === id);
}

export function saveWorkspace(data) {
  if (data.id) {
    const w = DB.workspaces.find(x => x.id === data.id);
    if (w) Object.assign(w, data);
  } else {
    data.id = 'w' + Date.now();
    DB.workspaces.push(data);
  }
  saveDB();
  return data;
}

export function deleteWorkspace(id) {
  DB.workspaces = DB.workspaces.filter(w => w.id !== id);
  DB.areas = DB.areas.filter(a => a.workspaceId !== id);
  saveDB();
}

// ── Areas ────────────────────────────────────────────────────────────────

export function getAreas(workspaceId) {
  if (workspaceId) return DB.areas.filter(a => a.workspaceId === workspaceId);
  return DB.areas;
}

export function getArea(id) {
  return DB.areas.find(a => a.id === id);
}

export function saveArea(data) {
  if (data.id) {
    const a = DB.areas.find(x => x.id === data.id);
    if (a) Object.assign(a, data);
  } else {
    data.id = 'a' + Date.now();
    DB.areas.push(data);
  }
  saveDB();
  return data;
}

export function deleteArea(id) {
  DB.areas = DB.areas.filter(a => a.id !== id);
  saveDB();
}
