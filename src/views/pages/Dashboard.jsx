/**
 * views/pages/Dashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Panel principal, con vista distinta según el rol (super_admin ve todos
 * los espacios y equipos; admin ve su equipo; usuario ve sus propios
 * clientes y módulos). La composición vive aquí; cada visual reutilizable
 * está en `views/pages/dashboard/` (charts.jsx, TeamGrid, WorkspacesOverview,
 * RecentRatings, ModuleUsage, InsightBanner) para que este archivo se
 * quede en "qué mostrar según el rol", no en "cómo se dibuja cada gráfica".
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEjs, getEj } from '../../models/Ejecutivo';
import { getClis, getClisForEj } from '../../models/Cliente';
import { getInfs, getInfCountForCli } from '../../models/Informe';
import { getWorkspaces } from '../../models/Workspace';
import { getModuloConfig } from '../../models/ModuloConfig';
import { ROLE_LABEL, MODULOS } from '../../models/constants';
import { getTeamMonthlyProgress } from '../../controllers/reportingController';
import { MESES_LARGOS } from '../../utils/format';
import SortTimePanel from '../common/SortTimePanel';
import { Gauge, Delta, TrendChart } from './dashboard/charts';
import InsightBanner from './dashboard/InsightBanner';
import { computeInsight } from './dashboard/insight';
import TeamGrid from './dashboard/TeamGrid';
import WorkspacesOverview from './dashboard/WorkspacesOverview';
import RecentRatings from './dashboard/RecentRatings';
import { AdoptionChart, MyModulesGrid } from './dashboard/ModuleUsage';

const RATING_WINDOW_DAYS = 45;

/** Informes calificados, más recientes primero, con nombre de cliente/ejecutivo resueltos. */
function buildRatedList(infs, clis, ejs) {
  return infs
    .filter(i => i.rating)
    .map(i => ({
      ...i,
      cliNom: clis.find(c => c.id === i.cliId)?.nom || i.cliNom || '—',
      ejNom: ejs.find(e => e.id === i.ejId)?.nom || i.ejNom || '',
    }))
    .sort((a, b) => (b.ratedAt || b.ts || '').localeCompare(a.ratedAt || a.ts || ''));
}

export default function Dashboard({ ejId, user }) {
  const [mis, setMis] = useState([]);
  const [kpis, setKpis] = useState({ cli: 0, mes: 0, pend: 0, tot: 0 });
  const [team, setTeam] = useState([]);
  const [ws, setWs] = useState([]);
  const [months, setMonths] = useState([]);
  const [ratedList, setRatedList] = useState([]);
  const [scopeInfs, setScopeInfs] = useState([]);
  const ejecutivo = getEj(ejId);
  const role = user?.role || 'usuario';
  const cfg = user ? getModuloConfig(user.id) : {};

  useEffect(() => {
    const isSuper = role === 'super_admin';
    const clis = isSuper ? getClis() : ejId ? getClisForEj(ejId) : getClis();
    const infs = getInfs();
    const allClis = getClis();
    const allEjs = getEjs();
    const hoy = new Date();
    const mc = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
    const im = infs.filter(i => i.per === mc && clis.find(c => c.id === i.cliId));
    const pend = Math.max(0, clis.length - im.length);
    setMis(clis);
    setKpis({ cli: clis.length, mes: im.length, pend, tot: infs.length });

    const teamRows = (isSuper || role === 'admin') ? getTeamMonthlyProgress(user) : [];
    setTeam(teamRows);
    setWs(getWorkspaces());

    // Tendencia 6 meses, con etiqueta larga para el tooltip.
    const mArr = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const per = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const cnt = infs.filter(x => x.per === per).length;
      mArr.push({ label: d.toLocaleDateString('es-CO', { month: 'short' }), fullLabel: MESES_LARGOS[d.getMonth()] + ' ' + d.getFullYear(), cnt });
    }
    setMonths(mArr);

    // Alcance de informes para el resto del panel: super_admin ve todo,
    // admin ve el de su equipo, usuario ve el de sus propios clientes.
    let scoped = infs;
    if (isSuper) scoped = infs;
    else if (role === 'admin') {
      const teamIds = new Set(teamRows.map(t => t.user.id));
      scoped = infs.filter(i => teamIds.has(i.ejId));
    } else {
      scoped = infs.filter(i => clis.find(c => c.id === i.cliId));
    }
    setScopeInfs(scoped);
    setRatedList(buildRatedList(scoped, allClis, allEjs));
  }, [ejId, user, role]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const pct = kpis.cli > 0 ? Math.round((kpis.mes / kpis.cli) * 100) : 0;
  const rated = ratedList;
  const avgRating = rated.length ? (rated.reduce((s, i) => s + i.rating, 0) / rated.length).toFixed(1) : '—';
  const cutoff = Date.now() - RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const lowRated = rated.filter(i => i.rating <= 3 && new Date(i.ratedAt || i.ts).getTime() >= cutoff);
  const insight = computeInsight({ role, kpis, team, lowRated });
  const prevMonthCnt = months.length >= 2 ? months[months.length - 2].cnt : null;

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>{greeting()}, {ejecutivo?.nom || user?.nom || ''} <span style={{ background: role === 'super_admin' ? '#12212D' : role === 'admin' ? '#168A43' : '#E8BB26', color: role === 'usuario' ? '#12212D' : '#fff', padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, marginLeft: 8 }}>{ROLE_LABEL[role]}</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--grt)', background: '#fff', padding: '6px 10px', borderRadius: 20, border: '1px solid var(--grb)' }}>📅 {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>
      <div className="ps">
        {role === 'super_admin' && `Panel Super Admin — ${ws.length} espacios · ${getEjs().length} personas · Control total · ★ ${avgRating} calidad promedio`}
        {role === 'admin' && `Panel Administrador — ${ejecutivo?.zona || ''} · Seguimiento mensual de tu equipo · ${team.length} personas`}
        {role === 'usuario' && `Panel Usuario — ${ejecutivo?.zona || ''} · ${kpis.cli} clientes · ${Object.values(cfg).filter(Boolean).length}/${MODULOS.length} módulos activos`}
      </div>

      <InsightBanner insight={insight} />

      <SortTimePanel />

      <div className="kgrid">
        <div className="kpi" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Gauge pct={pct} />
          <div>
            <div className="kl">Completitud mes</div>
            <div className="kv" style={{ fontSize: 20 }}>{kpis.mes}/{kpis.cli}</div>
            <div className="ks">{pct}% completado · {kpis.pend} pendientes</div>
          </div>
        </div>
        <div className="kpi">
          <div className="kl">{role === 'super_admin' ? 'Clientes totales' : 'Mis clientes'}</div>
          <div className="kv">{kpis.cli}</div>
          <div className="ks">{role === 'super_admin' ? `${getEjs().filter(u => u.role === 'usuario').length} usuarios activos` : (ejecutivo?.zona || user?.email || '')}</div>
        </div>
        <div className="kpi am">
          <div className="kl">Informes este mes</div>
          <div className="kv">{kpis.mes}</div>
          <div className="ks">Pendientes: {kpis.pend} · Total histórico: {kpis.tot}</div>
          <div style={{ marginTop: 4 }}><Delta current={kpis.mes} previous={prevMonthCnt} /></div>
        </div>
        <div className="kpi" style={{ borderLeftColor: '#E8BB26' }}>
          <div className="kl">Calidad promedio</div>
          <div className="kv" style={{ fontSize: 20 }}>{avgRating !== '—' ? avgRating + ' ★' : '—'}</div>
          <div className="ks">{rated.length} informe{rated.length !== 1 ? 's' : ''} calificado{rated.length !== 1 ? 's' : ''}{role === 'usuario' ? ' (tuyos)' : ' (tu alcance)'}</div>
        </div>
      </div>

      {/* Tendencia */}
      <div className="card">
        <div className="ct">📈 Tendencia — informes últimos 6 meses</div>
        <TrendChart months={months} />
      </div>

      {role === 'super_admin' && (
        <>
          <div className="card" style={{ borderTop: '3px solid #12212D' }}>
            <div className="ct">◆ Espacios — vista global</div>
            <WorkspacesOverview workspaces={ws} />
            <div className="brow"><Link to="/espacios" className="btn bvd bsm">Gestionar espacios →</Link><Link to="/aejecutivos" className="btn bgh bsm">Ver personas</Link></div>
          </div>

          <div className="card">
            <div className="ct">👥 Seguimiento de equipos — todos · Indicadores por ejecutivo</div>
            <TeamGrid team={team} limit={6} />
            <div className="brow"><Link to="/equipo" className="btn bam bsm">Ver detalle equipo →</Link></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="ct">🧩 Adopción de módulos — toda la organización</div>
              <AdoptionChart infs={scopeInfs} />
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="ct">⭐ Últimas calificaciones — feedback de clientes</div>
              <RecentRatings ratings={ratedList} teamView />
            </div>
          </div>
        </>
      )}

      {role === 'admin' && team.length > 0 && (
        <>
          <div className="card" style={{ borderTop: '3px solid #168A43' }}>
            <div className="ct">👥 Mi equipo — seguimiento mensual con indicadores</div>
            <TeamGrid team={team} />
            <div className="brow"><Link to="/equipo" className="btn bvd bsm">Asignar clientes →</Link><Link to="/aejecutivos" className="btn bgh bsm">Gestionar personas</Link></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="ct">🧩 Adopción de módulos — mi equipo</div>
              <AdoptionChart infs={scopeInfs} />
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="ct">⭐ Últimas calificaciones — mi equipo</div>
              <RecentRatings ratings={ratedList} teamView />
            </div>
          </div>
        </>
      )}

      {role === 'usuario' && (
        <>
          <div className="card" style={{ borderTop: '3px solid #E8BB26', background: '#FFFEF5' }}>
            <div className="ct">⚙️ Mis módulos — lo que va a incluir tu próximo informe</div>
            <MyModulesGrid cfg={cfg} />
            <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Configuración guardada para <strong>{user?.email}</strong>.</span>
              <span style={{ background: '#fff', padding: '4px 8px', borderRadius: 20, border: '1px solid var(--grb)' }}>📄 {mis.length} clientes</span>
              <span style={{ background: '#fff', padding: '4px 8px', borderRadius: 20, border: '1px solid var(--grb)' }}>📊 {kpis.tot} informes históricos</span>
            </div>
            <div className="brow"><Link to="/config-modulos" className="btn bam bsm">Configurar módulos →</Link><Link to="/nuevo" className="btn bvd bsm">Nuevo informe</Link></div>
          </div>

          <div className="card">
            <div className="ct">⭐ Últimas calificaciones de mis clientes</div>
            <RecentRatings ratings={ratedList} />
          </div>
        </>
      )}

      <div className="card">
        <div className="ct">{role === 'super_admin' ? 'Clientes — vista global' : 'Mis clientes — acceso rápido'}</div>
        {mis.length === 0 && <p style={{ color: 'var(--grt)', fontSize: 13 }}>No hay clientes asignados. {role === 'admin' && 'Asigna clientes en Mi equipo.'}</p>}
        {mis.slice(0, 8).map(c => {
          const ni = getInfCountForCli(c.id);
          const last = getInfs().filter(i => i.cliId === c.id).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))[0];
          return (
            <div key={c.id} className="clcard">
              <div className="clav">{c.nom.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="clnm">{c.nom}</div>
                <div className="clmt">{[c.marca, c.ciu, c.sec].filter(Boolean).join(' · ')} {last ? '· Último: ' + last.per : '· Sin informes'}</div>
              </div>
              <div className="clri" style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {last?.rating && <span style={{ color: '#E8BB26', fontWeight: 800, fontSize: 12 }}>{'★'.repeat(last.rating)}</span>}
                <span className="b bok">{ni} informe{ni !== 1 ? 's' : ''}</span>
                <Link to="/nuevo" className="btn bvd bsm">+ Nuevo</Link>
              </div>
            </div>
          );
        })}
        {mis.length > 8 && <div style={{ textAlign: 'center', marginTop: 8 }}><Link to="/clientes" className="btn bgh bsm">Ver todos ({mis.length}) →</Link></div>}
      </div>

      <div className="card">
        <div className="ct">Acciones rápidas</div>
        <div className="brow" style={{ marginTop: 0, gap: 8 }}>
          <Link to="/nuevo" className="btn bvd">📊 Nuevo informe</Link>
          <Link to="/config-modulos" className="btn bam">⚙️ Mis módulos</Link>
          <Link to="/guardados" className="btn bgh">📋 Guardados {rated.length > 0 && `· ${avgRating}★`}</Link>
          {role !== 'usuario' && <Link to="/equipo" className="btn bgh">👥 Mi equipo</Link>}
          {role === 'super_admin' && <Link to="/espacios" className="btn bgh">◆ Espacios</Link>}
        </div>
      </div>
    </div>
  );
}
