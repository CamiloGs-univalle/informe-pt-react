/**
 * models/Cliente.js
 * ─────────────────────────────────────────────────────────────────────────
 * Domain model for "Cliente" (a company an Ejecutivo generates reports
 * for). Each cliente belongs to exactly one Ejecutivo at a time
 * (many-clientes → one-ejecutivo), reassignable via `assignClientesToUser`.
 *
 * See docs/MODEL.md for the full entity/field reference.
 */
import { DB, saveDB } from './db';
import { nuevoId } from '../utils/ids';

/** Returns every Cliente record. */
export function getClis() {
  return DB.clis;
}

/** Finds a single Cliente by id. */
export function getCli(id) {
  return DB.clis.find(c => c.id === id);
}

/** Returns the clientes assigned to a given Ejecutivo. */
export function getClisForEj(ejId) {
  return DB.clis.filter(c => c.ejId === ejId);
}

/** Number of clientes assigned to a given Ejecutivo. */
export function getCliCountForEj(ejId) {
  return DB.clis.filter(c => c.ejId === ejId).length;
}

/** Creates or updates a Cliente. */
export function saveCli(data) {
  if (data.id) {
    const c = DB.clis.find(x => x.id === data.id);
    if (c) Object.assign(c, data);
  } else {
    data.id = nuevoId('c', DB.clis);
    data.logo = data.logo || null;
    data.driveFolder = data.driveFolder || '';
    data.asignaciones = data.asignaciones || {};
    DB.clis.push(data);
  }
  saveDB();
  return data;
}

/** Asigna un usuario a un cliente para un área específica (ej: psicólogo SST a cliente X) */
export function asignarAreaACliente(cliId, areaId, userId) {
  const c = DB.clis.find(x => x.id === cliId);
  if (!c) return null;
  if (!c.asignaciones) c.asignaciones = {};
  if (userId) c.asignaciones[areaId] = userId;
  else delete c.asignaciones[areaId];
  saveDB();
  return c;
}

/** Obtiene el usuario asignado a un área de un cliente */
export function getAsignado(cliId, areaId) {
  const c = DB.clis.find(x => x.id === cliId);
  return c?.asignaciones?.[areaId] || null;
}

/** Clientes donde un usuario está asignado en alguna área */
export function getClisForAreaUser(userId) {
  return DB.clis.filter(c => c.asignaciones && Object.values(c.asignaciones).includes(userId));
}

/** Deletes a Cliente by id. */
export function deleteCli(id) {
  DB.clis = DB.clis.filter(c => c.id !== id);
  // Sin dejar huérfanos: informes, aportes y configuraciones propias de ese cliente.
  DB.infs = DB.infs.filter(i => i.cliId !== id);
  DB.contribuciones = DB.contribuciones.filter(c => c.cliId !== id);
  Object.keys(DB.moduloConfigs).forEach(k => { if (k.endsWith('_' + id)) delete DB.moduloConfigs[k]; });
  saveDB();
}

/** Bulk-reassigns a list of clientes to a single Ejecutivo (admin action). */
export function assignClientesToUser(clienteIds, userId) {
  clienteIds.forEach(cid => {
    const c = DB.clis.find(x => x.id === cid);
    if (c) c.ejId = userId;
  });
  saveDB();
}

/** Returns a map of `{ [ejecutivoId]: assignedClienteCount }`. */
export function getClientesAsignacionResumen() {
  const map = {};
  DB.clis.forEach(c => { if (c.ejId) map[c.ejId] = (map[c.ejId] || 0) + 1; });
  return map;
}

/** Remembers the last Google Drive folder path used for a Cliente. */
export function saveCliFolder(cliId, folderPath) {
  const c = DB.clis.find(x => x.id === cliId);
  if (c) { c.driveFolder = folderPath; saveDB(); }
}

/** Reads the remembered Google Drive folder path for a Cliente. */
export function getCliFolder(cliId) {
  const c = DB.clis.find(x => x.id === cliId);
  return c ? c.driveFolder : '';
}
