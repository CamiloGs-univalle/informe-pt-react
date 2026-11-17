/**
 * views/pages/AdminClientes.jsx  (menú: "Gestionar clientes")
 * ─────────────────────────────────────────────────────────────────────────
 * Alta, edición y baja de clientes y su equipo: el ejecutivo líder (arma el
 * informe final) y la persona de cada área que aporta (Selección, SST…).
 * Las áreas salen de "Espacios y áreas", no están fijas en el código.
 * Acepta ?persona=<id> para ver los clientes de alguien (viene de "Mi equipo").
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DB } from '../../models/db';
import { saveCli, deleteCli, asignarAreaACliente, assignClientesToUser } from '../../models/Cliente';
import { clientesDe, equipoIds } from '../../models/Alcance';
import { fmtNum, fmtNit, plural } from '../../utils/format';
import { tieneLogo } from '../../services/logos.service';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import ClienteLogo from '../common/ClienteLogo';
import Modal from '../common/Modal';

const POR_PAGINA = 25;
const VACIO = { nom: '', marca: '', nit: '', ciu: '', sec: '', ejId: '', driveFolder: '', logo: '', asig: {} };

/** Reduce el logo subido (máx. 360 px): el documento de Firestore no puede pasar de 1 MB. */
function reducirLogo(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const k = Math.min(1, 360 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

export default function AdminClientes({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [params, setParams] = useSearchParams();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [sel, setSel] = useState(() => new Set());
  const [lotePersona, setLotePersona] = useState('');
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);

  const esSA = user.role === 'super_admin';
  const persona = params.get('persona') || '';

  // Alcance: super admin todo; admin, los de su equipo + los que aún no tienen líder.
  const visibles = useMemo(() => {
    const propios = new Set(clientesDe(user).map(c => c.id));
    return esSA ? DB.clis : DB.clis.filter(c => propios.has(c.id) || !c.ejId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, esSA, DB.clis.length, DB.clis]);

  const ids = equipoIds(user);
  const gente = DB.ejs.filter(e => e.activo !== false && (esSA || ids.has(e.id)));
  const areas = useMemo(() => { const v = new Set(); return DB.areas.filter(a => (a.modulos || []).length).filter(a => (v.has(a.nombre) ? false : v.add(a.nombre))); }, [DB.areas]); // eslint-disable-line react-hooks/exhaustive-deps
  const nombre = (id) => DB.ejs.find(e => e.id === id)?.nom || '';
  const equipoCompleto = (c) => !!c.ejId && areas.every(a => c.asignaciones?.[a.id]);

  const stats = { total: visibles.length, sinLider: visibles.filter(c => !c.ejId).length, completos: visibles.filter(equipoCompleto).length, sinLogo: visibles.filter(c => !tieneLogo(c)).length };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return visibles
      .filter(c => !q || (c.nom + ' ' + (c.marca || '') + ' ' + (c.nit || '') + ' ' + (c.ciu || '')).toLowerCase().includes(q))
      .filter(c => !persona || c.ejId === persona || Object.values(c.asignaciones || {}).includes(persona))
      .filter(c => filtro === 'todos' ? true : filtro === 'sinLider' ? !c.ejId : filtro === 'incompletos' ? !equipoCompleto(c) : filtro === 'sinLogo' ? !tieneLogo(c) : filtro.startsWith('sin:') ? !c.asignaciones?.[filtro.slice(4)] : true)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibles, busca, filtro, persona, areas]);

  const abrirNuevo = () => { setForm({ ...VACIO, asig: {} }); setEditId(null); };
  const abrirEditar = (c) => { setForm({ nom: c.nom, marca: c.marca || '', nit: c.nit || '', ciu: c.ciu || '', sec: c.sec || '', ejId: c.ejId || '', driveFolder: c.driveFolder || '', logo: c.logo || '', asig: { ...(c.asignaciones || {}) } }); setEditId(c.id); };
  const cerrar = () => { setForm(null); setEditId(null); };

  const subirLogo = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { const url = await reducirLogo(f); setForm(prev => ({ ...prev, logo: url })); }
    catch (err) { toast(err.message, 'error'); }
  };

  const guardar = () => {
    const nom = form.nom.trim();
    if (!nom) { toast('Escribe el nombre del cliente.', 'error'); return; }
    const nit = form.nit.replace(/\D/g, '');
    if (nit && DB.clis.some(c => c.id !== editId && (c.nit || '').replace(/\D/g, '') === nit)) { toast('Ya existe un cliente con ese NIT.', 'error'); return; }
    const guardado = saveCli({ id: editId || undefined, nom, marca: form.marca.trim(), nit: form.nit.trim(), ciu: form.ciu.trim(), sec: form.sec.trim(), ejId: form.ejId, driveFolder: form.driveFolder.trim(), logo: form.logo || null, workspaceId: DB.clis.find(c => c.id === editId)?.workspaceId || user.workspaceId });
    areas.forEach(a => asignarAreaACliente(guardado.id, a.id, form.asig[a.id] || null));
    toast(editId ? 'Cliente actualizado.' : `${nom} quedó registrado.`, 'ok');
    cerrar(); refresh();
  };

  const eliminar = async (c) => {
    const nInf = DB.infs.filter(i => i.cliId === c.id).length;
    const nCt = DB.contribuciones.filter(x => x.cliId === c.id).length;
    const ok = await confirmar({ title: `Eliminar a ${c.nom}`, message: `Se borrarán también ${plural(nInf, 'informe guardado', 'informes guardados')} y ${plural(nCt, 'aporte de las áreas', 'aportes de las áreas')} de este cliente. Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar cliente', danger: true });
    if (!ok) return;
    deleteCli(c.id); setSel(s => { const n = new Set(s); n.delete(c.id); return n; }); refresh(); toast('Cliente eliminado.', 'ok');
  };

  const alternar = (id) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todosMarcados = filtrados.length > 0 && filtrados.every(c => sel.has(c.id));
  const asignarLote = () => {
    if (!lotePersona || !sel.size) return;
    assignClientesToUser([...sel], lotePersona);
    toast(`${plural(sel.size, 'cliente')} ahora ${sel.size === 1 ? 'lo lidera' : 'los lidera'} ${nombre(lotePersona)}.`, 'ok');
    setSel(new Set()); setLotePersona(''); refresh();
  };

  const personaFiltro = persona ? DB.ejs.find(e => e.id === persona) : null;
  const gentePorArea = (areaId) => gente.filter(e => e.areaId === areaId);

  return (
    <div>
      <PageHeader title="Gestionar clientes"
        subtitle="Registra clientes, define quién lidera su informe final y quién aporta por cada área."
        actions={<button type="button" className="btn bvd" onClick={abrirNuevo}>+ Nuevo cliente</button>} />

      <div className="kgrid">
        <div className="kpi"><div className="kl">Clientes</div><div className="kv">{fmtNum(stats.total)}</div><div className="ks">En tu alcance</div></div>
        <div className={'kpi' + (stats.sinLider ? ' ro' : '')}><div className="kl">Sin ejecutivo líder</div><div className="kv">{fmtNum(stats.sinLider)}</div><div className="ks">Nadie arma su informe</div></div>
        <div className="kpi"><div className="kl">Equipo completo</div><div className="kv">{fmtNum(stats.completos)}</div><div className="ks">Líder y todas las áreas</div></div>
        <div className="kpi am"><div className="kl">Sin logo</div><div className="kv">{fmtNum(stats.sinLogo)}</div><div className="ks">Se muestran con iniciales</div></div>
      </div>

      {personaFiltro && (
        <div className="alrt avd toolbar-inline">
          <span>Mostrando los clientes de <strong>{personaFiltro.nom}</strong>.</span>
          <button type="button" className="btn bgh bsm" style={{ marginLeft: 'auto' }} onClick={() => { const n = new URLSearchParams(params); n.delete('persona'); setParams(n); }}>Ver todos</button>
        </div>
      )}

      <div className="toolbar">
        <input className="finput grow" type="search" placeholder="Buscar por nombre, marca, NIT o ciudad…" value={busca} onChange={e => { setBusca(e.target.value); setMostrar(POR_PAGINA); }} aria-label="Buscar clientes" />
        <select className="finput" style={{ width: 'auto' }} value={filtro} onChange={e => { setFiltro(e.target.value); setMostrar(POR_PAGINA); }} aria-label="Filtrar clientes">
          <option value="todos">Todos</option>
          <option value="sinLider">Sin ejecutivo líder</option>
          <option value="incompletos">Con equipo incompleto</option>
          {areas.map(a => <option key={a.id} value={'sin:' + a.id}>Sin {a.nombre}</option>)}
          <option value="sinLogo">Sin logo</option>
        </select>
        <span className="count">{filtrados.length} de {visibles.length}</span>
      </div>

      {sel.size > 0 && (
        <div className="alrt avd toolbar-inline" role="region" aria-label="Acciones en lote">
          <strong>{plural(sel.size, 'cliente')} seleccionados.</strong>
          <span>Asignar como ejecutivo líder a:</span>
          <select className="finput" style={{ maxWidth: 260, marginLeft: 0 }} value={lotePersona} onChange={e => setLotePersona(e.target.value)} aria-label="Ejecutivo líder del lote">
            <option value="">— Elige una persona —</option>
            {gente.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <button type="button" className="btn bvd bsm" onClick={asignarLote} disabled={!lotePersona}>Asignar</button>
          <button type="button" className="btn bgh bsm" onClick={() => setSel(new Set())}>Quitar selección</button>
        </div>
      )}

      {!filtrados.length ? (
        <EmptyState icon="🏢" title={visibles.length ? 'Ningún cliente coincide' : 'Aún no hay clientes'}
          action={visibles.length ? <button type="button" className="btn bgh" onClick={() => { setBusca(''); setFiltro('todos'); }}>Quitar filtros</button> : <button type="button" className="btn bvd" onClick={abrirNuevo}>Registrar el primer cliente</button>}>
          {visibles.length ? 'Prueba con otra búsqueda o quita los filtros.' : 'Registra a tus clientes para poder armar sus informes.'}
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" aria-label="Seleccionar todos los clientes de la lista" checked={todosMarcados} onChange={e => setSel(e.target.checked ? new Set(filtrados.map(c => c.id)) : new Set())} /></th>
                <th>Cliente</th><th>Ejecutivo líder</th>
                {areas.map(a => <th key={a.id}>{a.nombre}</th>)}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, mostrar).map(c => (
                <tr key={c.id} className={sel.has(c.id) ? 'row-sel' : ''}>
                  <td><input type="checkbox" aria-label={'Seleccionar ' + c.nom} checked={sel.has(c.id)} onChange={() => alternar(c.id)} /></td>
                  <td>
                    <div className="person" style={{ minWidth: 260 }}>
                      <ClienteLogo cli={c} size={36} />
                      <div><div className="person-n">{c.nom}</div><div className="person-m">{c.nit ? 'NIT ' + fmtNit(c.nit) : 'Sin NIT'}{c.ciu ? ' · ' + c.ciu : ''}</div></div>
                    </div>
                  </td>
                  <td>{c.ejId ? (nombre(c.ejId) || <span className="chip ro">Persona eliminada</span>) : <span className="chip ro">Sin asignar</span>}</td>
                  {areas.map(a => <td key={a.id}>{c.asignaciones?.[a.id] ? (nombre(c.asignaciones[a.id]) || <span className="chip ro">Eliminada</span>) : <span className="text-muted">—</span>}</td>)}
                  <td><div className="row-acts"><button type="button" className="btn bgh bsm" onClick={() => abrirEditar(c)}>Editar</button><button type="button" className="btn bro bsm" onClick={() => eliminar(c)}>Eliminar</button></div></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4 + areas.length} className="text-muted" style={{ padding: '10px 14px' }}>Mostrando {Math.min(mostrar, filtrados.length)} de {filtrados.length}</td></tr></tfoot>
          </table>
        </div>
      )}
      {filtrados.length > mostrar && <div style={{ textAlign: 'center', marginTop: 12 }}><button type="button" className="btn bgh" onClick={() => setMostrar(m => m + POR_PAGINA)}>Ver {Math.min(POR_PAGINA, filtrados.length - mostrar)} más</button></div>}

      <Modal open={!!form} onClose={cerrar} title={editId ? 'Editar cliente' : 'Nuevo cliente'} wide>
        {form && (
          <>
            <div className="fg2">
              <div><label className="flabel" htmlFor="c-nom">Razón social *</label><input id="c-nom" className="finput" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} autoFocus /></div>
              <div><label className="flabel" htmlFor="c-marca">Marca (opcional)</label><input id="c-marca" className="finput" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /></div>
            </div>
            <div className="fg3">
              <div><label className="flabel" htmlFor="c-nit">NIT</label><input id="c-nit" className="finput" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="Solo números" inputMode="numeric" /></div>
              <div><label className="flabel" htmlFor="c-ciu">Ciudad</label><input id="c-ciu" className="finput" value={form.ciu} onChange={e => setForm({ ...form, ciu: e.target.value })} /></div>
              <div><label className="flabel" htmlFor="c-sec">Sector</label><input id="c-sec" className="finput" value={form.sec} onChange={e => setForm({ ...form, sec: e.target.value })} /></div>
            </div>

            <h4 className="mdl-sub">Quién trabaja este cliente</h4>
            <div className="fg2">
              <div>
                <label className="flabel" htmlFor="c-lider">Ejecutivo líder (arma el informe final)</label>
                <select id="c-lider" className="finput" value={form.ejId} onChange={e => setForm({ ...form, ejId: e.target.value })}>
                  <option value="">— Sin asignar —</option>
                  {gente.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              {areas.map(a => (
                <div key={a.id}>
                  <label className="flabel" htmlFor={'c-area-' + a.id}>{a.nombre} (aporta su parte)</label>
                  <select id={'c-area-' + a.id} className="finput" value={form.asig[a.id] || ''} onChange={e => setForm({ ...form, asig: { ...form.asig, [a.id]: e.target.value } })}>
                    <option value="">— Sin asignar —</option>
                    {gentePorArea(a.id).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <h4 className="mdl-sub">Logo</h4>
            <div className="logo-row">
              <ClienteLogo cli={{ nom: form.nom, nit: form.nit, logo: form.logo }} size={64} />
              <div>
                <label className="btn bgh bsm" style={{ cursor: 'pointer' }}>{form.logo ? 'Cambiar logo' : 'Subir logo'}<input type="file" accept="image/*" hidden onChange={subirLogo} /></label>
                {form.logo && <button type="button" className="btn bgh bsm" style={{ marginLeft: 8 }} onClick={() => setForm({ ...form, logo: '' })}>Quitar</button>}
                <div className="text-muted" style={{ marginTop: 6 }}>Si no subes uno, se usa el de la carpeta de logos (por NIT) o las iniciales.</div>
              </div>
            </div>
            <div className="brow"><button type="button" className="btn bvd" onClick={guardar}>{editId ? 'Guardar cambios' : 'Registrar cliente'}</button><button type="button" className="btn bgh" onClick={cerrar}>Cancelar</button></div>
          </>
        )}
      </Modal>
    </div>
  );
}
