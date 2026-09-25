/**
 * models/ModuloConfig.js
 * ─────────────────────────────────────────────────────────────────────────
 * Per-user (and optionally per-user-per-cliente) preferences for which
 * report modules (see `MODULOS` in constants.js) are active. Lets a Usuario
 * configure their report once and have it remembered for next time.
 *
 * See docs/MODEL.md for the full entity/field reference.
 */
import { DB, saveDB } from './db';
import { MODULOS } from './constants';

/** Returns the global module config for a user (all-on by default). */
export function getModuloConfig(userId) {
  const key = userId || 'global';
  const stored = DB.moduloConfigs[key];
  if (stored) return stored;
  const def = {};
  MODULOS.forEach(m => { def[m.id] = true; });
  return def;
}

/** Saves the global module config for a user. */
export function saveModuloConfig(userId, cfg) {
  const key = userId || 'global';
  DB.moduloConfigs[key] = { ...cfg };
  saveDB();
}

/** Returns the module config for a user, optionally overridden per cliente. */
export function getModuloConfigForClient(userId, cliId) {
  const uk = userId + '_' + cliId;
  const stored = DB.moduloConfigs[uk];
  if (stored) return stored;
  return getModuloConfig(userId);
}

/** Saves a per-cliente override of the module config for a user. */
export function saveModuloConfigForClient(userId, cliId, cfg) {
  const uk = userId + '_' + cliId;
  DB.moduloConfigs[uk] = { ...cfg };
  saveDB();
}
