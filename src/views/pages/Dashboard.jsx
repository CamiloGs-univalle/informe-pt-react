/**
 * views/pages/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de inicio. Muestra LO QUE LE TOCA a cada persona (no los datos de
 * toda la empresa):
 *  - Equipo de área  → sus aportes pendientes (ver `dashboard/WorkerHome.jsx`).
 *  - Ejecutivo líder → sus clientes, aportes por validar e informes del período.
 *  - Admin           → lo mismo, sobre su equipo.
 *  - Super admin     → lo mismo sobre toda la organización + espacios.
 * El alcance sale de `models/Alcance.js`.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DB } from '../../models/db';
import { getWorkspaces } from '../../models/Workspace';
import { getModuloConfig } from '../../models/ModuloConfig';
import { ESTADOS } from '../../models/Contribucion';
import { ROLE_LABEL, MODULOS } from '../../models/constants';
import { capacidades, clientesQueLidera, informesDe } from '../../models/Alcance';
import { getTeamMonthlyProgress } from '../../controllers/reportingController';
import { MESES_LARGOS, periodoActual, fmtNum, fmtDec, plural, fmtPerLong } from '../../utils/format';
import PeriodPicker from '../common/PeriodPicker';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import ClienteLogo from '../common/ClienteLogo';
import { Gauge, Delta, TrendChart } from './dashboard/charts';
import InsightBanner from './dashboard/InsightBanner';
import { computeInsight } from './dashboard/insight';
import TeamGrid from './dashboard/TeamGrid';
import WorkspacesOverview from './dashboard/WorkspacesOverview';
import RecentRatings from './dashboard/RecentRatings';
import { AdoptionChart, MyModulesGrid } from './dashboard/ModuleUsage';
import { esperadoPct } from './dashboard/utils';
import { moduloIncluido } from '../../models/ModuloConfig';
import WorkerHome from './dashboard/WorkerHome';

const RATING_WINDOW_DAYS = 45;

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
}

/** Últimos 6 meses terminando en el período elegido, con el conteo de informes de cada uno. */
function tendencia(infs, per) {
  const [y, m] = per.split('-').map(Number);
  const out = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    out.push({
      label: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
      fullLabel: MESES_LARGOS[d.getMonth()] + ' ' + d.getFullYear(),
      cnt: infs.filter(x => x.per === key).length,
    });
  }
  return out;
}

export default function Dashboard({ user }) {
  const [per, setPer] = useState(periodoActual());
  const caps = capacidades(user);
  const role = user?.role || 'usuario';
  const esEquipo = role === 'admin' || role === 'super_admin';

  const datos = useMemo(() => {
    if (!caps.esLider) return null;
    const clis = clientesQueLidera(user);
    const infs = informesDe(user);
    const cliIds = new Set(clis.map(c => c.id));
    const infsPer = infs.filter(i => i.per === per);
    const conInforme = clis.filter(c => infsPer.some(i => i.cliId === c.id));
    const pendientes = clis.filter(c => !infsPer.some(i => i.cliId === c.id));
    const porValidar = DB.contribuciones.filter(ct => ct.per === per && ct.estado === ESTADOS.COMPLETADO && cliIds.has(ct.cliId)).length;
    const validados = DB.contribuciones.filter(ct => ct.per === per && ct.estado === ESTADOS.VALIDADO && cliIds.has(ct.cliId)).length;
    const team = esEquipo ? getTeamMonthlyProgress(user, per) : [];
    const rated = infs.filter(i => i.rating)
      .map(i => ({ ...i, cliNom: DB.clis.find(c => c.id === i.cliId)?.nom || i.cliNom || '—', ejNom: DB.ejs.find(e => e.id === i.ejId)?.nom || i.ejNom || '' }))
      .sort((a, b) => (b.ratedAt || b.ts || '').localeCompare(a.ratedAt || a.ts || ''));
    const cutoff = Date.now() - RATING_WINDOW_DAYS * 86400000;
    const lowRated = rated.filter(i => i.rating <= 3 && new Date(i.ratedAt || i.ts).getTime() >= cutoff);
    const months = tendencia(infs, per);
    return { clis, infs, infsPer, conInforme, pendientes, porValidar, validados, team, rated, lowRated, months };
  }, [user, per, esEquipo, caps.esLider]);

  if (!datos) {
    return (
      <div>
        <PageHeader title={`${saludo()}, ${user.nom.split(' ')[0]}`} badge={ROLE_LABEL[role]} subtitle={[user.zona, 'Equipo de área'].filter(Boolean).join(' · ')} />
        <WorkerHome user={user} />
      </div>
    );
  }

  const { clis, infs, conInforme, pendientes, porValidar, validados, team, rated, lowRated, months } = datos;
  const pct = clis.length ? Math.round((conInforme.length / clis.length) * 100) : 0;
  const avg = rated.length ? rated.reduce((s, i) => s + i.rating, 0) / rated.length : null;
  const prevCnt = months.length >= 2 ? months[months.length - 2].cnt : null;
  // Módulos que van en TODOS los clientes que lidera (el detalle por cliente está en Mis módulos).
  const modulosActivos = MODULOS.filter(m => (clis.length ? clis.every(c => moduloIncluido(c, m.id)) : getModuloConfig(user.id)[m.id] !== false)).length;
  const kpis = { cli: clis.length, pend: pendientes.length, porValidar };
  const esperado = esperadoPct(per);
  const insight = computeInsight({ kpis, team, lowRated, esEquipo, esperado });

  const subtitulo = role === 'super_admin'
    ? `${plural(getWorkspaces().length, 'espacio')} · ${plural(DB.ejs.filter(e => e.activo !== false).length, 'persona activa', 'personas activas')} · ${plural(clis.length, 'cliente')}`
    : role === 'admin'
      ? `Resumen de tu equipo (${plural(team.length, 'persona')}) · ${plural(clis.length, 'cliente')}`
      : [user.zona, plural(clis.length, 'cliente') + ' a tu cargo', `${modulosActivos} de ${MODULOS.length} módulos activos`].filter(Boolean).join(' · ');

  return (
    <div>
      <PageHeader
        title={`${saludo()}, ${user.nom.split(' ')[0]}`}
        badge={ROLE_LABEL[role]}
        subtitle={subtitulo}
        actions={(
          <PeriodPicker value={per} onChange={setPer} max={periodoActual()} />
        )}
      />

      <InsightBanner insight={insight} />

      <div className="kgrid">
        <div className="kpi kpi-gauge">
          <Gauge pct={pct} />
          <div>
            <div className="kl">Informes de {fmtPerLong(per)}</div>
            <div className="kv kv-md">{fmtNum(conInforme.length)} de {fmtNum(clis.length)}</div>
            <div className="ks">{pendientes.length === 0 ? 'Todos los clientes tienen informe' : `Faltan ${plural(pendientes.length, 'cliente')}`}</div>
          </div>
        </div>
        <Link to="/colaborativo" className={'kpi kpi-link' + (porValidar ? ' am' : '')}>
          <div className="kl">Aportes por validar</div>
          <div className="kv">{fmtNum(porValidar)}</div>
          <div className="ks">{validados ? `${fmtNum(validados)} ya validados` : 'Esperan tu revisión'}</div>
        </Link>
        <div className="kpi">
          <div className="kl">Informes en el período</div>
          <div className="kv">{fmtNum(datos.infsPer.length)}</div>
          <div className="ks">{fmtNum(infs.length)} en total</div>
          <div className="kpi-delta"><Delta current={datos.infsPer.length} previous={prevCnt} /></div>
        </div>
        <Link to="/guardados" className="kpi kpi-link am">
          <div className="kl">Calidad promedio</div>
          <div className="kv kv-md">{avg !== null ? fmtDec(avg) + ' ★' : '—'}</div>
          <div className="ks">{rated.length ? plural(rated.length, 'informe calificado', 'informes calificados') : 'Aún sin calificaciones'}</div>
        </Link>
      </div>

      {pendientes.length > 0 && (
        <div className="card">
          <div className="ct">Clientes sin informe en {fmtPerLong(per)}</div>
          <ul className="todo-list">
            {pendientes.slice(0, 6).map(c => (
              <li key={c.id}>
                <ClienteLogo cli={c} size={34} radius={8} />
                <div className="todo-main">
                  <div className="todo-t text-ellipsis">{c.nom}</div>
                  <div className="todo-s text-ellipsis">{[c.ciu, DB.ejs.find(e => e.id === c.ejId)?.nom && 'Ejecutivo: ' + DB.ejs.find(e => e.id === c.ejId).nom].filter(Boolean).join(' · ')}</div>
                </div>
                <Link to={`/nuevo?cliente=${c.id}`} className="btn bvd bsm">Crear informe</Link>
              </li>
            ))}
          </ul>
          {pendientes.length > 6 && <div className="brow"><Link to="/clientes" className="btn bgh bsm">Ver los {fmtNum(pendientes.length)} clientes →</Link></div>}
        </div>
      )}

      <div className="card">
        <div className="ct">Informes por mes (últimos 6 meses)</div>
        <TrendChart months={months} />
      </div>

      {role === 'super_admin' && (
        <div className="card">
          <div className="ct">Espacios de trabajo</div>
          <WorkspacesOverview workspaces={getWorkspaces()} />
          <div className="brow"><Link to="/espacios" className="btn bvd bsm">Gestionar espacios</Link><Link to="/aejecutivos" className="btn bgh bsm">Ver personas</Link></div>
        </div>
      )}

      {esEquipo && (
        <div className="card">
          <div className="ct">{role === 'super_admin' ? 'Avance de todos los equipos' : 'Avance de mi equipo'} · {fmtPerLong(per)}</div>
          <TeamGrid team={team} esperado={esperado} limit={role === 'super_admin' ? 6 : undefined} />
          <div className="brow"><Link to="/equipo" className="btn bam bsm">Ver detalle del equipo →</Link></div>
        </div>
      )}

      <div className="grid-2">
        {esEquipo && (
          <div className="card">
            <div className="ct">Módulos más usados en los informes</div>
            <AdoptionChart infs={infs} />
          </div>
        )}
        <div className="card">
          <div className="ct">Últimas calificaciones de clientes</div>
          {rated.length ? <RecentRatings ratings={rated} teamView={esEquipo} /> : (
            <EmptyState icon="⭐" title="Aún no hay calificaciones">
              Cuando entregues un informe, califícalo en <Link to="/guardados" className="link">Informes guardados</Link> para llevar el registro de cómo lo recibió el cliente.
            </EmptyState>
          )}
        </div>
      </div>

      {!esEquipo && (
        <div className="card">
          <div className="ct">Módulos de mis informes</div>
          <MyModulesGrid clientes={clis} />
          <div className="brow"><Link to="/config-modulos" className="btn bam bsm">Cambiar en Mis módulos</Link><Link to="/nuevo" className="btn bvd bsm">Nuevo informe</Link></div>
        </div>
      )}
    </div>
  );
}
