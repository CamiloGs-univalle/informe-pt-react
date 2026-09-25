/**
 * src/store.js — MOVED
 * ─────────────────────────────────────────────────────────────────────────
 * This monolithic "store" was split into the layered `models/` +
 * `controllers/` structure as part of the MVC architecture migration (see
 * docs/ARCHITECTURE.md and CHANGELOG.md):
 *
 *   models/db.js              → loadDB, saveDB, DB
 *   models/constants.js       → ROLES, ROLE_LABEL, ROLE_DESC, MODULOS, MOTIVOS_PRE, FOTOLABELS
 *   models/Ejecutivo.js       → getEjs, getEj, saveEj, deleteEj, auth helpers, hasRole/isAdmin/isSuperAdmin
 *   models/Cliente.js         → getClis, getCli, saveCli, deleteCli, assignment helpers
 *   models/Informe.js         → getInfs, saveInf, deleteInf, counters
 *   models/Workspace.js       → workspaces + areas CRUD
 *   models/ModuloConfig.js    → per-user/per-cliente module preferences
 *   controllers/reportingController.js → getTeamMonthlyProgress
 *   utils/format.js           → fmtPer, fmtPerLong, fmtSize
 *   utils/notify.js           → toast
 *
 * This file is kept only as a re-export barrel for backwards
 * compatibility (in case something outside this codebase still imports
 * "./store" or "../store"). Nothing in this project imports it anymore —
 * safe to delete once you've confirmed that in your own forks/branches.
 */
export * from './models/db.js';
export * from './models/constants.js';
export * from './models/Ejecutivo.js';
export * from './models/Cliente.js';
export * from './models/Informe.js';
export * from './models/Workspace.js';
export * from './models/ModuloConfig.js';
export { getTeamMonthlyProgress } from './controllers/reportingController.js';
export { fmtPer, fmtPerLong, fmtSize } from './utils/format.js';
export { toast } from './utils/notify.js';
