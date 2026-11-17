/**
 * views/pages/MisContribuciones.jsx  (menú: "Mis aportes")
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de la persona que aporta su parte del informe (Selección, SST,
 * Bienestar, Atención…): ve los clientes que le tocan en el período, entra a
 * cada uno, llena el formulario real de los módulos de su área y lo envía al
 * ejecutivo líder. También ve las correcciones que le piden, su historial y
 * su calidad de trabajo.
 *
 * Parámetros de la URL (los usan los accesos directos del Inicio):
 *   ?cliente=<id>&area=<id>&per=<AAAA-MM>   abre ese aporte
 *   ?tab=correcciones|historial              abre esa pestaña
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DB } from '../../models/db';
import { getContribucion, getContribucionesForUser, ESTADOS } from '../../models/Contribucion';
import { tareasDe, areasDeAporte } from '../../models/Alcance';
import { periodoActual, fmtNum, fmtPerLong, plural } from '../../utils/format';
import PageHeader from '../common/PageHeader';
import PeriodPicker from '../common/PeriodPicker';
import EmptyState from '../common/EmptyState';
import InsightBanner from './dashboard/InsightBanner';
import { computeStats, computeWorkerInsight } from './contribuciones/stats';
import QualityCard from './contribuciones/QualityCard';
import RecomendacionesPanel from './contribuciones/RecomendacionesPanel';
import HistorialList from './contribuciones/HistorialList';
import TaskGrid from './contribuciones/TaskGrid';
import AporteEditor from './contribuciones/AporteEditor';

const ORDEN = { [ESTADOS.RECHAZADO]: 0, [ESTADOS.PENDIENTE]: 1, [ESTADOS.EN_PROCESO]: 2, [ESTADOS.COMPLETADO]: 3, [ESTADOS.VALIDADO]: 4 };
const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'hacer', label: 'Por hacer', test: e => [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO, ESTADOS.RECHAZADO].includes(e) },
  { id: 'enviados', label: 'Enviados', test: e => e === ESTADOS.COMPLETADO },
  { id: 'validados', label: 'Validados', test: e => e === ESTADOS.VALIDADO },
];

export default function MisContribuciones({ user }) {
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const periodo = /^\d{4}-\d{2}$/.test(params.get('per') || '') ? params.get('per') : periodoActual();
  const tab = params.get('tab') === 'historial' ? 'historial' : 'pendientes';
  const esSA = user.role === 'super_admin';
  const areasSA = useMemo(() => areasDeAporte(user), [user]);
  const areaSA = params.get('areaSA') || areasSA[0]?.id || '';

  const patch = (cambios) => {
    const next = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: false });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tareas = useMemo(() => tareasDe(user, esSA ? areaSA : null), [user, esSA, areaSA, version]);
  const items = tareas.map(t => ({ ...t, contrib: getContribucion(t.cli.id, periodo, t.area.id) }));
  const variasAreas = new Set(items.map(i => i.area.id)).size > 1;

  const historial = getContribucionesForUser(user.id).map(c => ({
    ...c, cliNom: DB.clis.find(x => x.id === c.cliId)?.nom || 'Cliente eliminado', areaNom: DB.areas.find(a => a.id === c.areaId)?.nombre || 'Área',
  })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const stats = computeStats(historial, periodo);
  stats.pendientesPeriodo = items.filter(i => !i.contrib || [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO].includes(i.contrib.estado)).length;
  stats.completadasPeriodo = items.filter(i => i.contrib && [ESTADOS.COMPLETADO, ESTADOS.VALIDADO].includes(i.contrib.estado)).length;
  const insight = computeWorkerInsight(stats);

  const filtroActual = FILTROS.find(f => f.id === filtro);
  const visibles = items
    .filter(i => !search.trim() || (i.cli.nom + ' ' + (i.cli.nit || '')).toLowerCase().includes(search.trim().toLowerCase()))
    .filter(i => !filtroActual.test || filtroActual.test(i.contrib?.estado || ESTADOS.PENDIENTE))
    .sort((a, b) => ORDEN[a.contrib?.estado || ESTADOS.PENDIENTE] - ORDEN[b.contrib?.estado || ESTADOS.PENDIENTE] || a.cli.nom.localeCompare(b.cli.nom));

  // Aporte abierto (viene de la URL)
  const cliSel = params.get('cliente');
  const areaSel = params.get('area') || (items.find(i => i.cli.id === cliSel)?.area.id);
  const abierto = cliSel && areaSel ? items.find(i => i.cli.id === cliSel && i.area.id === areaSel) : null;

  const abrir = (cli, area, per = periodo) => patch({ cliente: cli.id, area: area.id, per, tab: '' });
  const cerrar = () => patch({ cliente: '', area: '' });
  const corregir = (c) => {
    const cli = DB.clis.find(x => x.id === c.cliId); const area = DB.areas.find(a => a.id === c.areaId);
    if (cli && area) abrir(cli, area, c.per);
  };
  const abrirHistorial = (c) => corregir(c);

  const encabezado = (
    <PageHeader
      title="Mis aportes"
      subtitle="Elige un cliente, llena la parte de tu área y envíala al ejecutivo líder. Si te piden correcciones, las verás aquí."
      actions={<PeriodPicker value={periodo} onChange={(p) => patch({ per: p, cliente: '', area: '' })} max={periodoActual()} />}
    />
  );

  if (abierto) {
    return (
      <div>
        {encabezado}
        <AporteEditor key={abierto.cli.id + abierto.area.id + periodo} user={user} cli={abierto.cli} area={abierto.area} per={periodo} contrib={abierto.contrib}
          onClose={cerrar} onChanged={refresh} />
      </div>
    );
  }

  if (!items.length && !historial.length) {
    return (
      <div>
        {encabezado}
        <EmptyState icon="🗂️" title="Todavía no tienes clientes para aportar">
          {esSA ? 'Elige un área para ver los clientes, o asigna personas a los clientes en Clientes y asignaciones.' : 'Tu administrador debe asignarte a los clientes donde vas a aportar. En cuanto lo haga, aparecerán aquí.'}
        </EmptyState>
        {esSA && areasSA.length > 0 && <div className="toolbar" style={{ marginTop: 14 }}><label className="flabel" style={{ margin: 0 }}>Área</label><select className="finput" value={areaSA} onChange={e => patch({ areaSA: e.target.value })}>{areasSA.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>}
      </div>
    );
  }

  return (
    <div>
      {encabezado}
      {esSA && (
        <div className="alrt avd toolbar-inline">
          <span>Como super admin ves los aportes de cualquier área. Elige cuál quieres trabajar:</span>
          <select className="finput" style={{ maxWidth: 260 }} value={areaSA} onChange={e => patch({ areaSA: e.target.value, cliente: '', area: '' })} aria-label="Área a trabajar">
            {areasSA.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
      )}

      <InsightBanner insight={insight} />

      <div className="kgrid">
        <div className={'kpi' + (stats.pendientesPeriodo ? ' am' : '')}><div className="kl">Por reportar</div><div className="kv">{fmtNum(stats.pendientesPeriodo)}</div><div className="ks">{fmtPerLong(periodo)}</div></div>
        <div className="kpi"><div className="kl">Enviados</div><div className="kv">{fmtNum(stats.completadasPeriodo)}</div><div className="ks">Con el ejecutivo o validados</div></div>
        <div className={'kpi' + (stats.rechazadasActivas.length ? ' ro' : '')}><div className="kl">Con correcciones</div><div className="kv">{fmtNum(stats.rechazadasActivas.length)}</div><div className="ks">Necesitan tu atención</div></div>
        <div className="kpi"><div className="kl">Validados en total</div><div className="kv">{fmtNum(stats.validadasHistorico)}</div><div className="ks">Histórico</div></div>
      </div>

      <RecomendacionesPanel items={stats.rechazadasActivas.map(c => ({ ...c, cliNom: historial.find(x => x.id === c.id)?.cliNom, areaNom: historial.find(x => x.id === c.id)?.areaNom }))} onFix={corregir} />

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'pendientes'} className={'tab' + (tab === 'pendientes' ? ' on' : '')} onClick={() => patch({ tab: '' })}>Clientes de {fmtPerLong(periodo)} ({items.length})</button>
        <button type="button" role="tab" aria-selected={tab === 'historial'} className={'tab' + (tab === 'historial' ? ' on' : '')} onClick={() => patch({ tab: 'historial' })}>Mi historial ({historial.length})</button>
      </div>

      {tab === 'historial' ? (
        <>
          <HistorialList items={historial} onOpen={abrirHistorial} />
          <div style={{ marginTop: 14 }}><QualityCard stats={stats} /></div>
        </>
      ) : (
        <>
          <div className="toolbar">
            <input className="finput grow" type="search" placeholder="Buscar cliente por nombre o NIT…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar cliente" />
            <div className="seg" role="group" aria-label="Filtrar por estado">
              {FILTROS.map(f => <button key={f.id} type="button" className={'seg-b' + (filtro === f.id ? ' on' : '')} onClick={() => setFiltro(f.id)}>{f.label}</button>)}
            </div>
            <span className="count">{plural(visibles.length, 'cliente')}</span>
          </div>
          {visibles.length
            ? <TaskGrid items={visibles} selectedKey="" onSelect={(cli, area) => abrir(cli, area)} mostrarArea={variasAreas} />
            : <EmptyState icon="🔎" title="No hay clientes con ese filtro" action={<button type="button" className="btn bgh" onClick={() => { setSearch(''); setFiltro('todos'); }}>Quitar filtros</button>}>Prueba otro estado o borra la búsqueda.</EmptyState>}
          <div style={{ marginTop: 14 }}><QualityCard stats={stats} /></div>
        </>
      )}
    </div>
  );
}
