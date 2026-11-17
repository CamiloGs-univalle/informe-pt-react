/**
 * controllers/reportingController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Cálculos que cruzan varias entidades (personas + clientes + informes +
 * aportes) y por eso no viven en un solo modelo.
 *
 *   Vista (Dashboard / Mi equipo) → este controlador → modelos
 */
import { DB } from '../models/db';
import { getUsersForAdmin } from '../models/Ejecutivo';
import { ESTADOS } from '../models/Contribucion';
import { tareasDe } from '../models/Alcance';
import { periodoActual } from '../utils/format';

/**
 * Avance mensual de cada persona del equipo en el período `per` (YYYY-MM).
 * Cada persona se mide por lo que realmente le toca:
 *  - `lider`: informes del período sobre los clientes que lidera.
 *  - `aporte`: aportes de su área (completados o validados) sobre los
 *    clientes donde está asignada.
 *  - `ambos`: lidera informes y además aporta: las dos cosas se suman.
 *  - `ninguno`: aún no tiene clientes (no cuenta como "atrasada").
 *
 * @returns {Array<{user, tipo, total, hechos, pend, pct}>}
 */
export function getTeamMonthlyProgress(adminUser, per = periodoActual()) {
  const equipo = adminUser?.role === 'super_admin' ? DB.ejs : getUsersForAdmin(adminUser?.id);
  const infsDelPeriodo = DB.infs.filter(i => i.per === per);
  const aportesDelPeriodo = DB.contribuciones.filter(c => c.per === per);

  return equipo.map(u => {
    // Lo que le toca a la persona = informes que lidera + partes que entrega en su área (si hace las dos, se suman).
    const clisLider = DB.clis.filter(c => c.ejId === u.id);
    const hechosLider = clisLider.filter(c => infsDelPeriodo.some(i => i.cliId === c.id)).length;
    // Mismas tareas que ve la persona en "Mis aportes" (tareasDe): cliente × área donde le toca aportar.
    const tareas = u.role === 'super_admin' ? [] : tareasDe(u);
    const hechosAporte = tareas.filter(t => aportesDelPeriodo.some(ct => ct.cliId === t.cli.id && ct.areaId === t.area.id
      && (ct.estado === ESTADOS.COMPLETADO || ct.estado === ESTADOS.VALIDADO))).length;
    if (clisLider.length && tareas.length) return resumen(u, 'ambos', clisLider.length + tareas.length, hechosLider + hechosAporte);
    if (clisLider.length) return resumen(u, 'lider', clisLider.length, hechosLider);
    if (tareas.length) return resumen(u, 'aporte', tareas.length, hechosAporte);
    return resumen(u, 'ninguno', 0, 0);
  });
}

function resumen(user, tipo, total, hechos) {
  return { user, tipo, total, hechos, pend: Math.max(0, total - hechos), pct: total ? Math.round((hechos / total) * 100) : 0 };
}
