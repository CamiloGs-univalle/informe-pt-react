/**
 * views/pages/Clientes.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * "Mis clientes": los clientes sobre los que la persona tiene algo que hacer
 * (los que lidera como ejecutivo, o donde aporta desde su área; todos los de
 * su equipo si es admin). Cada tarjeta responde tres preguntas: ¿tiene
 * informe este período?, ¿qué falta por área? y ¿cuál es el siguiente paso?
 */
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DB } from '../../models/db';
import { getInfsForCli } from '../../models/Informe';
import { getContribucionesForClientePeriodo, ESTADOS, ESTADO_META } from '../../models/Contribucion';
import { clientesDe, clientesQueLidera, capacidades } from '../../models/Alcance';
import { MODULOS } from '../../models/constants';
import { fmtNit, fmtPerLong, fmtDec, plural, periodoActual, fmtNum } from '../../utils/format';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import ClienteLogo from '../common/ClienteLogo';
import Modal from '../common/Modal';
import Stars from '../common/Stars';

const LABEL_MODULO = Object.fromEntries(MODULOS.map(m => [m.id, m.label]));
const PENDIENTES = [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO, ESTADOS.RECHAZADO];

function Anillo({ pct, size = 46 }) {
  const r = (size - 7) / 2, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  const col = pct === 100 ? '#168A43' : pct >= 50 ? '#C99A0A' : '#C0392B';
  return (
    <svg width={size} height={size} role="img" aria-label={`${pct} % de avance`} style={{ flexShrink: 0 }}>
      <g style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6EBE6" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </g>
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" style={{ fontSize: 12, fontWeight: 800, fill: col }}>{pct}%</text>
    </svg>
  );
}

export default function Clientes({ user }) {
  const navigate = useNavigate();
  const caps = capacidades(user);
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [detalle, setDetalle] = useState(null);
  const per = periodoActual();
  const lidera = useMemo(() => new Set(clientesQueLidera(user).map(c => c.id)), [user]);
  const areas = DB.areas.filter(a => (a.modulos || []).length);

  const filas = useMemo(() => clientesDe(user).map(c => {
    const infs = getInfsForCli(c.id).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    const verInformes = lidera.has(c.id);
    const tieneInforme = infs.some(i => i.per === per);
    const contribs = getContribucionesForClientePeriodo(c.id, per);
    const estadoArea = a => contribs.find(x => x.areaId === a.id)?.estado || ESTADOS.PENDIENTE;
    const faltan = areas.filter(a => PENDIENTES.includes(estadoArea(a)));
    const pct = areas.length ? Math.round(((areas.length - faltan.length) / areas.length) * 100) : (tieneInforme ? 100 : 0);
    const ultimo = infs[0];
    let reco, tono = 'ok';
    if (verInformes && tieneInforme) reco = 'Informe del período listo. Aprovecha para pedir la calificación del cliente.';
    else if (verInformes && !faltan.length && areas.length) { reco = 'Todos los aportes están completos: ya puedes crear el informe.'; tono = 'warn'; }
    else if (faltan.length) { reco = 'Faltan aportes de: ' + faltan.map(a => a.nombre).join(', ') + '.'; tono = faltan.length === areas.length ? 'bad' : 'warn'; }
    else reco = verInformes ? 'Aún no hay informe de este período.' : 'Tus aportes de este período están enviados.';
    return { c, infs, verInformes, tieneInforme, contribs, faltan, pct, ultimo, reco, tono, estadoArea };
  }), [user, per, lidera, areas]);

  const lista = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = filas.filter(({ c }) => !q || [c.nom, c.marca, c.ciu, c.nit].some(v => (v || '').toLowerCase().includes(q)));
    if (filtro === 'pendientes') l = l.filter(x => x.tono !== 'ok' || (x.verInformes && !x.tieneInforme));
    if (filtro === 'aldia') l = l.filter(x => x.tieneInforme || (!x.verInformes && x.faltan.length === 0));
    if (filtro === 'nuevos') l = l.filter(x => x.infs.length === 0);
    const cmp = {
      nombre: (a, b) => a.c.nom.localeCompare(b.c.nom, 'es'),
      pendientes: (a, b) => b.faltan.length - a.faltan.length || a.c.nom.localeCompare(b.c.nom, 'es'),
      informes: (a, b) => b.infs.length - a.infs.length,
    }[orden];
    return [...l].sort(cmp);
  }, [filas, search, filtro, orden]);

  const kpis = useMemo(() => {
    const conInforme = filas.filter(x => x.tieneInforme).length;
    const completos = filas.filter(x => x.faltan.length === 0).length;
    const rated = filas.flatMap(x => x.infs.filter(i => i.rating));
    return {
      total: filas.length,
      conInforme,
      conAportesCompletos: completos,
      calidad: rated.length ? rated.reduce((s, i) => s + i.rating, 0) / rated.length : null,
    };
  }, [filas]);

  const crearInforme = (c) => navigate('/nuevo?cliente=' + c.id);

  return (
    <div>
      <PageHeader
        title="Mis clientes"
        badge={plural(kpis.total, 'cliente')}
        subtitle={`Estado de cada cliente en ${fmtPerLong(per)}. Haz clic en una tarjeta para ver su historial y qué sigue.`}
      />

      <div className="kgrid">
        <div className="kpi"><div className="kl">Clientes</div><div className="kv">{fmtNum(kpis.total)}</div><div className="ks">A tu cargo o donde aportas</div></div>
        <div className="kpi am"><div className="kl">Con informe del período</div><div className="kv">{fmtNum(kpis.conInforme)}</div><div className="ks">{kpis.total ? Math.round(kpis.conInforme / kpis.total * 100) : 0} % de tus clientes</div></div>
        <div className="kpi"><div className="kl">Aportes completos</div><div className="kv">{fmtNum(kpis.conAportesCompletos)}</div><div className="ks">Todas las áreas enviaron su parte</div></div>
        <div className="kpi"><div className="kl">Calidad promedio</div><div className="kv kv-md">{kpis.calidad !== null ? fmtDec(kpis.calidad) + ' ★' : '—'}</div><div className="ks">Calificación de los clientes</div></div>
      </div>

      <div className="toolbar">
        <input className="finput grow" type="search" placeholder="Buscar por nombre, marca, ciudad o NIT" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar cliente" />
        <select className="finput" style={{ width: 'auto' }} value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Filtrar">
          <option value="todos">Todos</option>
          <option value="pendientes">Con pendientes</option>
          <option value="aldia">Al día</option>
          <option value="nuevos">Sin historial</option>
        </select>
        <select className="finput" style={{ width: 'auto' }} value={orden} onChange={e => setOrden(e.target.value)} aria-label="Ordenar">
          <option value="nombre">Orden: nombre</option>
          <option value="pendientes">Orden: más pendientes</option>
          <option value="informes">Orden: más informes</option>
        </select>
        <span className="count">{lista.length} de {filas.length}</span>
      </div>

      {filas.length === 0 && (
        <EmptyState icon="🗂️" title="Aún no tienes clientes">
          {caps.esAdmin ? 'Crea clientes y asígnalos a tu equipo desde “Gestionar clientes”.' : 'Cuando tu administrador te asigne clientes aparecerán aquí.'}
          {caps.esAdmin && <div style={{ marginTop: 12 }}><Link to="/aclientes" className="btn bvd">Ir a Gestionar clientes</Link></div>}
        </EmptyState>
      )}
      {filas.length > 0 && lista.length === 0 && (
        <EmptyState icon="🔎" title="Ningún cliente coincide" action={<button className="btn bgh" onClick={() => { setSearch(''); setFiltro('todos'); }}>Quitar filtros</button>}>
          Prueba con otro nombre o quita los filtros.
        </EmptyState>
      )}

      <div className="grid-auto">
        {lista.map(({ c, infs, verInformes, tieneInforme, faltan, pct, ultimo, reco, tono }) => (
          <article key={c.id} className={'cli-card tono-' + tono} onClick={() => setDetalle(c)} tabIndex={0} role="button"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetalle(c); } }} aria-label={'Ver detalle de ' + c.nom}>
            <div className="cli-top">
              <ClienteLogo cli={c} size={44} />
              <div className="cli-id">
                <h3 className="cli-nom clamp-2" title={c.nom}>{c.nom}</h3>
                <div className="cli-meta text-ellipsis">{[c.marca, c.ciu].filter(Boolean).join(' · ')}{c.nit ? ' · NIT ' + fmtNit(c.nit) : ''}</div>
              </div>
              <Anillo pct={tieneInforme ? 100 : pct} />
            </div>
            <div className="cli-chips">
              {verInformes && <span className={'chip ' + (tieneInforme ? 'vd' : 'ro')}>{tieneInforme ? 'Informe listo' : 'Sin informe'}</span>}
              {verInformes && <span className="chip">{plural(infs.length, 'informe')}</span>}
              {ultimo?.rating > 0 && <span className="chip am">★ {fmtDec(ultimo.rating)}</span>}
            </div>
            <div className={'cli-reco ' + tono}>
              <div className="cli-reco-t">Qué sigue</div>
              <div>{reco}</div>
            </div>
            <div className="cli-foot">
              <span className="cli-last text-ellipsis">{ultimo ? `Último informe: ${fmtPerLong(ultimo.per)}` : 'Sin historial'}</span>
              {verInformes && !tieneInforme && <button type="button" className="btn bvd bsm" onClick={e => { e.stopPropagation(); crearInforme(c); }}>Crear informe</button>}
              {(!verInformes || tieneInforme) && faltan.length === 0 && <span className="chip vd">Al día</span>}
            </div>
          </article>
        ))}
      </div>

      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.nom} wide>
        {detalle && (() => {
          const infs = getInfsForCli(detalle.id).sort((a, b) => (b.per || '').localeCompare(a.per || ''));
          const puedeVer = lidera.has(detalle.id);
          const contribs = getContribucionesForClientePeriodo(detalle.id, per);
          const ej = DB.ejs.find(e => e.id === detalle.ejId);
          const ultimo = infs[0];
          return (
            <div className="stack-14">
              <div className="cli-det-head">
                <ClienteLogo cli={detalle} size={56} radius={12} />
                <div style={{ minWidth: 0 }}>
                  <div className="cli-meta">{[detalle.marca, detalle.ciu, detalle.sec].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</div>
                  <div className="cli-meta">NIT {fmtNit(detalle.nit)} · Ejecutivo: <strong>{ej?.nom || 'sin asignar'}</strong></div>
                </div>
              </div>

              <div>
                <div className="flabel" style={{ marginTop: 0 }}>Aportes de {fmtPerLong(per)}</div>
                <div className="cli-chips">
                  {areas.map(a => {
                    const est = contribs.find(x => x.areaId === a.id)?.estado || ESTADOS.PENDIENTE;
                    const meta = ESTADO_META[est];
                    const resp = DB.ejs.find(e => e.id === detalle.asignaciones?.[a.id]);
                    return (
                      <span key={a.id} className="chip" style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '55' }} title={resp ? 'Responsable: ' + resp.nom : 'Sin responsable asignado'}>
                        {a.nombre}: {meta.label}{resp ? ' · ' + resp.nom.split(' ')[0] : ''}
                      </span>
                    );
                  })}
                  {!areas.length && <span className="chip">Aún no hay áreas con módulos configurados</span>}
                </div>
              </div>

              {puedeVer ? (
                <div>
                  <div className="flabel" style={{ marginTop: 0 }}>Historial de informes</div>
                  {infs.length ? (
                    <div className="tbl-wrap">
                      <table className="tbl">
                        <thead><tr><th>Período</th><th>Elaborado por</th><th>Módulos</th><th>Calificación</th></tr></thead>
                        <tbody>
                          {infs.slice(0, 8).map(inf => (
                            <tr key={inf.id}>
                              <td><strong>{fmtPerLong(inf.per)}</strong></td>
                              <td>{inf.ejNom || '—'}</td>
                              <td>{(inf.activeModules || []).map(m => LABEL_MODULO[m] || m).join(', ') || '—'}</td>
                              <td>{inf.rating ? <Stars value={inf.rating} readonly size={14} /> : <span className="text-muted">Sin calificar</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="alrt aam">Este cliente aún no tiene informes.</div>}
                  {ultimo?.feedback && <div className="quote">“{ultimo.feedback}”</div>}
                </div>
              ) : (
                <div className="alrt avd">Eres responsable de un área de este cliente. El informe final lo arma su ejecutivo{ej ? ' (' + ej.nom + ')' : ''}.</div>
              )}

              <div className="brow" style={{ justifyContent: 'space-between' }}>
                <button className="btn bgh" onClick={() => setDetalle(null)}>Cerrar</button>
                <div className="brow" style={{ margin: 0 }}>
                  {!puedeVer && <Link className="btn bvd" to={`/mis-contribuciones?cliente=${detalle.id}`}>Ir a mi aporte</Link>}
                  {puedeVer && <Link className="btn bgh" to="/colaborativo">Ver tablero del equipo</Link>}
                  {puedeVer && <button className="btn bvd" onClick={() => crearInforme(detalle)}>Crear informe para este cliente</button>}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
