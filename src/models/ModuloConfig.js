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

/** ¿Existe una configuración propia para este cliente (distinta de la global)? */
export function tieneConfigDeCliente(userId, cliId) {
  return !!DB.moduloConfigs[userId + '_' + cliId];
}

/** Quita la configuración propia de un cliente: vuelve a usar la global. */
export function resetModuloConfigForClient(userId, cliId) {
  const uk = userId + '_' + cliId;
  if (DB.moduloConfigs[uk]) { delete DB.moduloConfigs[uk]; saveDB(); }
}

/** Ids de los módulos que la persona incluye en el informe de un cliente (propia del cliente, o la global). */
export function modulosActivosDe(userId, cliId) {
  const cfg = cliId ? getModuloConfigForClient(userId, cliId) : getModuloConfig(userId);
  return MODULOS.filter(m => cfg[m.id] !== false).map(m => m.id);
}

// ─────────────────────────────────────────────────────────────────────────
// Decisión por cliente: ¿este módulo va o no va en el informe de este cliente?
//
// Dos personas opinan, y las dos tienen que estar de acuerdo:
//  • el ejecutivo líder del cliente (qué secciones lleva su informe final), y
//  • la persona asignada al área dueña del módulo (si su área lo reporta o no
//    para ese cliente).
// Cada una guarda su decisión con las mismas funciones de arriba (global o por
// cliente). Esta es la ÚNICA fuente de verdad: el informe, el formulario del
// aporte, el tablero y los conteos de pendientes usan estas funciones.
// ─────────────────────────────────────────────────────────────────────────

/** Configuración completa (todos los módulos con true/false) de una persona para un cliente. */
export function cfgCompleta(userId, cliId) {
  const base = {};
  MODULOS.forEach(m => { base[m.id] = true; });
  return { ...base, ...(cliId ? getModuloConfigForClient(userId, cliId) : getModuloConfig(userId)) };
}

/** ¿El módulo va en el informe de este cliente? */
export function moduloIncluido(cli, modId) {
  if (!cli) return true;
  if (cli.ejId && cfgCompleta(cli.ejId, cli.id)[modId] === false) return false;
  return DB.areas.every(a => {
    if (!(a.modulos || []).includes(modId)) return true;
    const responsable = cli.asignaciones?.[a.id];
    return !responsable || cfgCompleta(responsable, cli.id)[modId] !== false;
  });
}

/** Ids de los módulos que sí van en el informe de este cliente. */
export function modulosEfectivos(cli) {
  return MODULOS.filter(m => moduloIncluido(cli, m.id)).map(m => m.id);
}

/** ¿El área tiene algo que reportar para este cliente? (si todos sus módulos están apagados, no hay tarea) */
export function areaAplica(cli, area) {
  const mods = area?.modulos || [];
  return mods.length > 0 && mods.some(m => moduloIncluido(cli, m));
}

/**
 * Enciende o apaga módulos para varios clientes de una sola vez (una sola
 * escritura). Si `tambienGlobal`, también cambia la configuración general de la
 * persona, para que los clientes nuevos nazcan igual. Las configuraciones
 * propias que quedan idénticas a la general se borran: así "tiene módulos
 * propios" significa algo.
 */
export function setModulosEnClientes(userId, cliIds, modIds, valor, { tambienGlobal = false, todosLosClientes = [] } = {}) {
  if (tambienGlobal) {
    DB.moduloConfigs[userId] = { ...cfgCompleta(userId, ''), ...Object.fromEntries(modIds.map(m => [m, valor])) };
  }
  const global = cfgCompleta(userId, '');
  const mismo = (a, b) => MODULOS.every(m => (a[m.id] !== false) === (b[m.id] !== false));
  const afectados = new Set([...cliIds, ...(tambienGlobal ? todosLosClientes : [])]);
  afectados.forEach(cid => {
    const cfg = { ...cfgCompleta(userId, cid) };
    if (cliIds.includes(cid)) modIds.forEach(m => { cfg[m] = valor; });
    if (mismo(cfg, global)) delete DB.moduloConfigs[userId + '_' + cid];
    else DB.moduloConfigs[userId + '_' + cid] = cfg;
  });
  saveDB();
}
