/**
 * controllers/reportingController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cross-entity reporting logic that doesn't belong to a single model
 * (it reads Ejecutivo + Cliente + Informe together). Kept as a controller
 * rather than bolted onto one model to avoid circular imports between
 * models and to make the "who calls whom" story explicit:
 *
 *   View (Dashboard/EquipoAdmin) → Controller (this file) → Models
 */
import { getInfs } from '../models/Informe';
import { getEjs, getUsersForAdmin } from '../models/Ejecutivo';
import { getClisForEj } from '../models/Cliente';

/**
 * Computes each team member's monthly report progress for the current
 * calendar month: how many of their assigned clientes already have an
 * Informe for this period, and how many are still pending.
 *
 * @param {object} adminUser - the admin/super_admin viewing the report.
 * @returns {Array<{user: object, total: number, hechos: number, pend: number, pct: number}>}
 */
export function getTeamMonthlyProgress(adminUser) {
  const teamUsers = adminUser?.role === 'super_admin' ? getEjs() : getUsersForAdmin(adminUser?.id);
  const hoy = new Date();
  const per = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  const infsThisMonth = getInfs().filter(i => i.per === per);
  return teamUsers.map(u => {
    const misClis = getClisForEj(u.id);
    const hechos = infsThisMonth.filter(i => misClis.find(c => c.id === i.cliId)).length;
    const pend = Math.max(0, misClis.length - hechos);
    const pct = misClis.length ? Math.round((hechos / misClis.length) * 100) : 0;
    return { user: u, total: misClis.length, hechos, pend, pct };
  });
}
