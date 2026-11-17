/**
 * views/pages/ConfigModulos.jsx  (menú: "Mis módulos")
 * ─────────────────────────────────────────────────────────────────────────
 * El único lugar donde se decide qué módulos van en el informe de cada cliente.
 *
 *  - Ejecutivo líder: elige qué secciones lleva el informe final de cada uno de
 *    sus clientes.
 *  - Persona de un área (Selección, SST…): elige, cliente por cliente, qué
 *    módulos de su área reporta.
 *  - Admin / super admin: pueden configurar a cualquier persona de su alcance.
 *
 * Vista "Global" = todos mis clientes a la vez (una casilla cambia el módulo en
 * todos; queda a medias si no va igual en todos). Vista de un cliente = solo ese.
 * La tabla "Cliente por cliente" permite dejar excepciones sin cambiar de
 * pantalla. Todo se guarda al instante y lo usan el formulario del aporte, el
 * tablero, los pendientes y el informe (ver models/ModuloConfig.js).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DB } from '../../models/db';
import { MODULOS } from '../../models/constants';
import { cfgCompleta, setModulosEnClientes } from '../../models/ModuloConfig';
import { areasDeAporte, clientesQueLidera, equipoIds, esLider } from '../../models/Alcance';
import { getEj } from '../../models/Ejecutivo';
import { fmtNum, plural } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';

/** Punto final que no duplica el de "S.A.". */
const fin = (t) => (String(t).endsWith('.') ? '' : '.');
const ON = (objetivoId, cliId, modId) => cfgCompleta(objetivoId, cliId)[modId] !== false;

/** Casilla que puede quedar "a medias" (indeterminate). */
function Casilla({ estado, onChange, label, ...rest }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = estado === 'mixto'; }, [estado]);
  return <input ref={ref} type="checkbox" checked={estado === 'todos'} onChange={onChange} aria-label={label} {...rest} />;
}

/** Arma los grupos de módulos que la persona puede decidir, con los clientes de cada uno. */
function gruposDe(objetivo) {
  const grupos = [];
  if (!objetivo) return grupos;
  if (objetivo.role === 'super_admin' || esLider(objetivo)) {
    grupos.push({
      key: 'lider', titulo: 'Informe final', ayuda: 'Qué secciones lleva el informe de cada cliente que lideras.',
      mods: MODULOS, clientes: clientesQueLidera(objetivo),
    });
  }
  if (objetivo.role !== 'super_admin') {
    const vistas = new Set();
    areasDeAporte(objetivo).forEach(a => {
      if (vistas.has(a.id)) return;
      vistas.add(a.id);
      grupos.push({
        key: a.id, titulo: a.nombre, ayuda: `Qué módulos de ${a.nombre} reportas en cada cliente.`,
        mods: MODULOS.filter(m => (a.modulos || []).includes(m.id)),
        clientes: DB.clis.filter(c => c.asignaciones?.[a.id] === objetivo.id),
        area: a,
      });
    });
  }
  return grupos.filter(g => g.mods.length);
}

export default function ConfigModulos({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const puedeElegir = user.role !== 'usuario';
  const [objetivoId, setObjetivoId] = useState(user.id);
  const [selCli, setSelCli] = useState(''); // '' = Global
  const [ultimo, setUltimo] = useState('');
  const [version, setVersion] = useState(0);
  const refrescar = (msg) => { setVersion(v => v + 1); if (msg) setUltimo(msg); };

  const personas = useMemo(() => {
    if (!puedeElegir) return [user];
    const ids = equipoIds(user);
    return DB.ejs.filter(e => ids.has(e.id) && e.activo !== false && (e.role === 'super_admin' || esLider(e) || areasDeAporte(e).length));
  }, [user, puedeElegir]);

  const objetivo = getEj(objetivoId) || user;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const grupos = useMemo(() => gruposDe(objetivo), [objetivo, version]);
  const clientesTodos = useMemo(() => {
    const m = new Map();
    grupos.forEach(g => g.clientes.forEach(c => m.set(c.id, c)));
    return [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [grupos]);
  const cliSel = clientesTodos.find(c => c.id === selCli) || null;
  const global = !cliSel;

  const cambiarObjetivo = (id) => { setObjetivoId(id); setSelCli(''); setUltimo(''); };

  /** Clientes sobre los que actúa la vista actual, dentro de un grupo. */
  const alcanceDe = (g) => (global ? g.clientes : g.clientes.filter(c => c.id === cliSel.id));

  const estadoDe = (g, modId) => {
    const cs = alcanceDe(g);
    if (!cs.length) return { estado: 'ninguno', n: 0, total: 0, faltan: [] };
    const faltan = cs.filter(c => !ON(objetivoId, c.id, modId));
    const n = cs.length - faltan.length;
    return { estado: n === cs.length ? 'todos' : n === 0 ? 'ninguno' : 'mixto', n, total: cs.length, faltan };
  };

  const cambiar = (g, modId, valor) => {
    const cs = alcanceDe(g);
    if (!cs.length) return;
    setModulosEnClientes(objetivoId, cs.map(c => c.id), [modId], valor, { tambienGlobal: global && g.key === 'lider' });
    const nom = MODULOS.find(m => m.id === modId)?.label || modId;
    const destino = global ? (cs.length === 1 ? cs[0].nom : `tus ${cs.length} clientes`) : cliSel.nom;
    refrescar(`Guardado: ${nom} ${valor ? 'ahora va' : 'ya no va'} en ${destino}${fin(destino)}`);
  };

  const cambiarFila = (g, cli, valor) => {
    setModulosEnClientes(objetivoId, [cli.id], g.mods.map(m => m.id), valor, {});
    refrescar(`Guardado: ${valor ? 'activaste' : 'desactivaste'} todos los módulos de ${g.titulo} en ${cli.nom}${cli.nom.endsWith('.') ? '' : '.'}`);
  };

  const cambiarTodo = async (valor) => {
    const trabajo = grupos.map(g => ({ g, cs: alcanceDe(g) })).filter(x => x.cs.length);
    if (!trabajo.length) return;
    const nMods = trabajo.reduce((s, x) => s + x.g.mods.length, 0);
    const alcance = global ? 'todos tus clientes' : cliSel.nom;
    if (!valor) {
      const ok = await confirmar({
        title: 'Desactivar todos los módulos',
        message: `Vas a quitar ${plural(nMods, 'módulo')} de ${alcance}. No se pedirán en los aportes ni saldrán en el informe. Puedes volver a activarlos cuando quieras.`,
        confirmLabel: 'Desactivar todo', danger: true,
      });
      if (!ok) return;
    }
    trabajo.forEach(({ g, cs }) => setModulosEnClientes(objetivoId, cs.map(c => c.id), g.mods.map(m => m.id), valor, { tambienGlobal: global && g.key === 'lider' }));
    refrescar();
    toast(`${valor ? 'Activaste' : 'Desactivaste'} todos los módulos de ${alcance}${alcance.endsWith('.') ? '' : '.'}`, 'ok');
  };

  // ── Tarjetas de arriba ────────────────────────────────────────────────
  let activos = 0; let total = 0; let distintos = 0;
  grupos.forEach(g => g.mods.forEach(m => {
    if (!alcanceDe(g).length) return;
    total++;
    const st = estadoDe(g, m.id).estado;
    if (st === 'todos') activos++;
    if (st === 'mixto') distintos++;
  }));
  const rolesTxt = [
    ...(grupos.some(g => g.key === 'lider') ? ['Ejecutivo líder'] : []),
    ...grupos.filter(g => g.area).map(g => g.titulo),
  ].join(' · ') || 'Sin área';

  if (!grupos.length) {
    return (
      <div>
        <PageHeader title="Mis módulos" subtitle="Decide qué módulos van en el informe de cada cliente." />
        {puedeElegir && personas.length > 1 && (
          <div className="toolbar">
            <label className="flabel" htmlFor="cfg-persona" style={{ margin: 0 }}>Configurando a</label>
            <select id="cfg-persona" className="finput" style={{ maxWidth: 360 }} value={objetivoId} onChange={e => cambiarObjetivo(e.target.value)}>
              {personas.map(p => <option key={p.id} value={p.id}>{p.nom}{p.id === user.id ? ' (yo)' : ''}</option>)}
            </select>
          </div>
        )}
        <EmptyState icon="🧭" title="Todavía no tienes módulos que decidir">
          Aparecerán aquí cuando lideres el informe de un cliente o te asignen a un cliente en un área con módulos. Eso lo hace tu administrador en Clientes y asignaciones.
        </EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Mis módulos"
        subtitle="Elige qué módulos van en cada cliente. Lo que apagues no se pide en los aportes ni aparece en el PDF, HTML o PowerPoint. Los cambios se guardan al instante." />

      {puedeElegir && personas.length > 1 && (
        <div className="toolbar">
          <label className="flabel" htmlFor="cfg-persona" style={{ margin: 0 }}>Configurando a</label>
          <select id="cfg-persona" className="finput" style={{ maxWidth: 360 }} value={objetivoId} onChange={e => cambiarObjetivo(e.target.value)}>
            {personas.map(p => <option key={p.id} value={p.id}>{p.nom}{p.id === user.id ? ' (yo)' : ''}</option>)}
          </select>
        </div>
      )}

      <div className="kgrid">
        <div className={'kpi' + (distintos ? ' am' : '')}>
          <div className="kl">Módulos activos</div>
          <div className="kv">{fmtNum(activos)}/{fmtNum(total)}</div>
          <div className="ks">{distintos ? `${plural(distintos, 'módulo')} ${distintos === 1 ? 'va distinto' : 'van distintos'} según el cliente` : 'Igual en todos los clientes de esta vista'}</div>
        </div>
        <div className="kpi"><div className="kl">Cliente seleccionado</div><div className="kv text-wrap-kv">{global ? 'Global' : cliSel.nom}</div><div className="ks">{global ? plural(clientesTodos.length, 'cliente') + ' a la vez' : 'Solo este cliente'}</div></div>
        <div className="kpi"><div className="kl">Usuario</div><div className="kv text-wrap-kv">{objetivo.nom}</div><div className="ks">{rolesTxt}</div></div>
      </div>

      <div className="card">
        <div className="toolbar" style={{ boxShadow: 'none', padding: 0, border: 'none', background: 'transparent', marginBottom: 12 }}>
          <label className="flabel" htmlFor="cfg-cliente" style={{ margin: 0 }}>Ver</label>
          <select id="cfg-cliente" className="finput grow" value={selCli} onChange={e => setSelCli(e.target.value)}>
            <option value="">Global — todos mis clientes ({clientesTodos.length})</option>
            {clientesTodos.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="button" className="btn bgh bsm" onClick={() => cambiarTodo(true)}>Activar todo</button>
          <button type="button" className="btn bgh bsm" onClick={() => cambiarTodo(false)}>Desactivar todo</button>
        </div>
        <p className="text-muted" style={{ margin: 0 }} role="status" aria-live="polite">
          {ultimo || (global ? 'En Global, una casilla cambia el módulo en todos tus clientes a la vez. Si queda a medias, no va igual en todos.' : `Los cambios aplican solo a ${cliSel.nom}${fin(cliSel.nom)}`)}
        </p>
      </div>

      {grupos.map(g => {
        const cs = alcanceDe(g);
        return (
          <div className="card" key={g.key}>
            <div className="ct">{g.titulo}</div>
            <p className="text-muted" style={{ marginBottom: 12 }}>{g.ayuda}</p>
            {!g.clientes.length ? (
              <div className="alrt aam">Todavía no tienes clientes en {g.area ? `esta área (${g.titulo})` : 'este grupo'}. Tu administrador los asigna en Clientes y asignaciones.</div>
            ) : !cs.length ? (
              <div className="alrt aam">{cliSel?.nom} no está en tu lista de {g.titulo}. Elige otro cliente o vuelve a Global.</div>
            ) : (
              <div className="mod-grid">
                {g.mods.map(m => {
                  const st = estadoDe(g, m.id);
                  return (
                    <label key={m.id} className={'mod-item' + (st.estado === 'todos' ? ' on' : st.estado === 'mixto' ? ' on mixed' : '')}>
                      <Casilla estado={st.estado} label={`${m.label} en ${global ? 'todos mis clientes' : cliSel.nom}`}
                        onChange={() => cambiar(g, m.id, st.estado !== 'todos')} />
                      <span className="mod-ico" aria-hidden="true">{m.icon}</span>
                      <span className="mod-txt">
                        <span className="mod-n">{m.label}</span>
                        <span className="mod-d">
                          {st.estado === 'mixto'
                            ? `En ${st.n} de ${st.total} · no va en ${st.faltan.slice(0, 2).map(c => c.nom).join(', ')}${st.faltan.length > 2 ? ` y ${st.faltan.length - 2} más` : ''}`
                            : m.desc}
                        </span>
                      </span>
                      <span className={'chip ' + (st.estado === 'todos' ? 'vd' : st.estado === 'mixto' ? 'am' : '')}>
                        {st.estado === 'todos' ? 'Incluido' : st.estado === 'mixto' ? 'Parcial' : 'Omitido'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {grupos.filter(g => g.clientes.length).map(g => (
        <div className="card" key={'mx-' + g.key}>
          <div className="ct">Cliente por cliente — {g.titulo}</div>
          <p className="text-muted" style={{ marginBottom: 10 }}>Una fila por cliente y una casilla por módulo: marca o quita cualquier excepción sin cambiar de vista.</p>
          <div className="mx-wrap">
            <table className="mx">
              <thead>
                <tr>
                  <th scope="col" className="mx-cli">Cliente</th>
                  {g.mods.map(m => <th scope="col" key={m.id}><span aria-hidden="true">{m.icon}</span> {m.label}</th>)}
                  <th scope="col">Fila</th>
                </tr>
              </thead>
              <tbody>
                {[...g.clientes].sort((a, b) => a.nom.localeCompare(b.nom)).map(c => {
                  const todas = g.mods.every(m => ON(objetivoId, c.id, m.id));
                  return (
                    <tr key={c.id} className={!global && cliSel.id === c.id ? 'mx-sel' : ''}>
                      <th scope="row" className="mx-cli">{c.nom}</th>
                      {g.mods.map(m => (
                        <td key={m.id}>
                          <input type="checkbox" checked={ON(objetivoId, c.id, m.id)}
                            aria-label={`${m.label} en ${c.nom}`}
                            onChange={() => { setModulosEnClientes(objetivoId, [c.id], [m.id], !ON(objetivoId, c.id, m.id), {}); refrescar(`Guardado: ${m.label} ${ON(objetivoId, c.id, m.id) ? 'ahora va' : 'ya no va'} en ${c.nom}${fin(c.nom)}`); }} />
                        </td>
                      ))}
                      <td><button type="button" className="link-btn" onClick={() => cambiarFila(g, c, !todas)}>{todas ? 'Quitar todo' : 'Poner todo'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
