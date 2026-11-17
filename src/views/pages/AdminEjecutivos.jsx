/**
 * views/pages/AdminEjecutivos.jsx  (menú: "Personas")
 * ─────────────────────────────────────────────────────────────────────────
 * Alta, edición y baja de personas. El acceso (contraseña o Google) lo maneja
 * Firebase Authentication: aquí solo se registra quién es la persona, su rol y
 * su área; entra con el mismo correo con el que se registró.
 *   · Super admin: ve y gestiona a todos.
 *   · Admin: gestiona a su equipo y crea personas en las áreas que administra.
 * Acepta ?editar=<id> (viene de "Mi equipo").
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DB } from '../../models/db';
import { saveEj, deleteEj, canDeleteEj } from '../../models/Ejecutivo';
import { getWorkspaces } from '../../models/Workspace';
import { equipoIds } from '../../models/Alcance';
import { MODULOS, ROLE_LABEL } from '../../models/constants';
import { fmtNum, plural, iniciales } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import { VerComoBtn } from '../common/ViewAs';

const VACIO = { nom: '', email: '', zona: '', role: 'usuario', areaId: '', workspaceId: '', activo: true };
const POR_PAGINA = 30;

export default function AdminEjecutivos({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [params, setParams] = useSearchParams();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [busca, setBusca] = useState('');
  const [fArea, setFArea] = useState('');
  const [fRol, setFRol] = useState('');
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [form, setForm] = useState(null); // null = cerrado
  const [editId, setEditId] = useState(null);

  const esSA = user.role === 'super_admin';
  const ids = equipoIds(user);
  const lista = DB.ejs.filter(e => ids.has(e.id) && (esSA || e.role !== 'super_admin'));
  const workspaces = getWorkspaces();
  // Áreas donde puede ubicar a alguien: todas (super admin) o las que administra / su propia área.
  const areasPermitidas = esSA ? DB.areas : DB.areas.filter(a => a.adminId === user.id || a.id === user.areaId);

  const abrirNuevo = () => {
    const area = areasPermitidas[0];
    setForm({ ...VACIO, areaId: area?.id || '', workspaceId: area?.workspaceId || user.workspaceId || workspaces[0]?.id || '' });
    setEditId(null);
  };
  const abrirEditar = (e) => {
    setForm({ nom: e.nom || '', email: e.email || '', zona: e.zona || '', role: e.role || 'usuario', areaId: e.areaId || '', workspaceId: e.workspaceId || '', activo: e.activo !== false });
    setEditId(e.id);
  };

  // Atajo desde "Mi equipo": ?editar=<id>
  const editarParam = params.get('editar');
  const [yaAbierto, setYaAbierto] = useState('');
  if (editarParam && yaAbierto !== editarParam) {
    const e = lista.find(x => x.id === editarParam);
    setYaAbierto(editarParam);
    if (e) abrirEditar(e);
  }
  const cerrar = () => { setForm(null); setEditId(null); if (params.get('editar')) { const n = new URLSearchParams(params); n.delete('editar'); setParams(n, { replace: true }); } };

  const guardar = () => {
    const nom = form.nom.trim();
    const email = form.email.trim().toLowerCase();
    if (!nom) { toast('Escribe el nombre de la persona.', 'error'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Escribe un correo válido: con él entrará a la plataforma.', 'error'); return; }
    if (!form.areaId) { toast('Elige el área de la persona.', 'error'); return; }
    const area = DB.areas.find(a => a.id === form.areaId);
    try {
      saveEj({ ...form, nom, email, workspaceId: area?.workspaceId || form.workspaceId, id: editId || undefined }, user);
      toast(editId ? 'Cambios guardados.' : `${nom} quedó registrada. Podrá entrar con ${email}.`, 'ok');
      cerrar(); refresh();
    } catch (e) { toast(e.message || 'No se pudo guardar.', 'error'); }
  };

  const eliminar = async (e) => {
    if (!canDeleteEj(user, e.id)) { toast(e.id === user.id ? 'No puedes eliminar tu propia cuenta.' : 'No tienes permiso para eliminar a esta persona.', 'error'); return; }
    const nCli = DB.clis.filter(c => c.ejId === e.id).length;
    const nAsig = DB.clis.filter(c => Object.values(c.asignaciones || {}).includes(e.id)).length;
    const detalle = [nCli && `${plural(nCli, 'cliente')} quedará${nCli === 1 ? '' : 'n'} sin ejecutivo líder`, nAsig && `se le quitará de ${plural(nAsig, 'asignación', 'asignaciones')} por área`].filter(Boolean).join(' y ');
    const ok = await confirmar({ title: `Eliminar a ${e.nom}`, message: (detalle ? `Al eliminarla, ${detalle}. ` : '') + 'Si solo quieres que no entre más, es mejor marcarla como inactiva. ¿Eliminar de todos modos?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    deleteEj(e.id); refresh(); toast('Persona eliminada.', 'ok');
  };
  const alternarActivo = (e) => {
    if (e.id === user.id) { toast('No puedes desactivar tu propia cuenta.', 'error'); return; }
    saveEj({ ...e, activo: e.activo === false }, user); refresh();
    toast(e.activo === false ? `${e.nom} está activa de nuevo.` : `${e.nom} ya no puede entrar.`, 'ok');
  };

  const filas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista
      .filter(e => !q || (e.nom + ' ' + (e.email || '') + ' ' + (e.zona || '')).toLowerCase().includes(q))
      .filter(e => !fArea || e.areaId === fArea)
      .filter(e => !fRol || e.role === fRol)
      .sort((a, b) => a.nom.localeCompare(b.nom));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista.length, busca, fArea, fRol, DB.ejs]);

  const areaDe = (id) => DB.areas.find(a => a.id === id);
  const areaForm = areaDe(form?.areaId);
  const ocupantes = (areaId) => lista.filter(e => e.areaId === areaId).length;

  return (
    <div>
      <PageHeader title="Personas"
        subtitle={esSA ? 'Registra a quien trabaja en la plataforma: su rol y su área. Entra con el mismo correo con el que lo registres.' : 'Registra y administra a las personas de tus áreas. Entran con el mismo correo con el que las registres.'}
        actions={<button type="button" className="btn bvd" onClick={abrirNuevo} disabled={!areasPermitidas.length}>+ Nueva persona</button>} />

      <div className="kgrid">
        <div className="kpi"><div className="kl">Personas</div><div className="kv">{fmtNum(lista.length)}</div><div className="ks">{fmtNum(lista.filter(e => e.activo !== false).length)} activas</div></div>
        {areasPermitidas.slice(0, 3).map(a => (
          <div key={a.id} className="kpi" style={{ borderLeftColor: a.color }}><div className="kl">{a.nombre}</div><div className="kv">{fmtNum(ocupantes(a.id))}</div><div className="ks">{ocupantes(a.id) === 1 ? 'persona' : 'personas'}</div></div>
        ))}
      </div>

      <div className="toolbar">
        <input className="finput grow" type="search" placeholder="Buscar por nombre, correo o zona…" value={busca} onChange={e => { setBusca(e.target.value); setMostrar(POR_PAGINA); }} aria-label="Buscar personas" />
        <select className="finput" style={{ width: 'auto' }} value={fArea} onChange={e => setFArea(e.target.value)} aria-label="Filtrar por área">
          <option value="">Todas las áreas</option>
          {DB.areas.filter(a => lista.some(e => e.areaId === a.id)).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select className="finput" style={{ width: 'auto' }} value={fRol} onChange={e => setFRol(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          <option value="usuario">{ROLE_LABEL.usuario}</option>
          <option value="admin">{ROLE_LABEL.admin}</option>
          {esSA && <option value="super_admin">{ROLE_LABEL.super_admin}</option>}
        </select>
        {(busca || fArea || fRol) && <button type="button" className="btn bgh bsm" onClick={() => { setBusca(''); setFArea(''); setFRol(''); }}>Limpiar</button>}
        <span className="count">{filas.length} de {lista.length}</span>
      </div>

      {!filas.length ? (
        <EmptyState icon="👥" title={lista.length ? 'Nadie coincide con los filtros' : 'Aún no hay personas'}
          action={!lista.length && areasPermitidas.length ? <button type="button" className="btn bvd" onClick={abrirNuevo}>Registrar la primera persona</button> : null}>
          {lista.length ? 'Prueba con otra búsqueda.' : 'Registra a tu equipo para poder asignarles clientes.'}
        </EmptyState>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Persona</th><th>Área</th><th>Rol</th><th>Zona</th><th className="num">Clientes</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filas.slice(0, mostrar).map(e => {
                const a = areaDe(e.areaId);
                const nCli = DB.clis.filter(c => c.ejId === e.id).length;
                return (
                  <tr key={e.id} className={e.activo === false ? 'row-off' : ''}>
                    <td><div className="person"><span className="person-av" style={{ background: a?.color || 'var(--grt)' }}>{iniciales(e.nom)}</span><div><div className="person-n">{e.nom}{e.id === user.id && <span className="chip" style={{ marginLeft: 6 }}>Tú</span>}</div><div className="person-m">{e.email}</div></div></div></td>
                    <td>{a ? <span className="chip" style={{ background: a.color, color: '#fff', borderColor: a.color }}>{a.nombre}</span> : <span className="text-muted">Sin área</span>}</td>
                    <td>{ROLE_LABEL[e.role] || e.role}</td>
                    <td>{e.zona || '—'}</td>
                    <td className="num">{fmtNum(nCli)}</td>
                    <td><span className={'chip ' + (e.activo === false ? 'ro' : 'vd')}>{e.activo === false ? 'Inactiva' : 'Activa'}</span></td>
                    <td>
                      <div className="row-acts">
                        <VerComoBtn persona={e} actualId={user.id} />
                        <button type="button" className="btn bgh bsm" onClick={() => abrirEditar(e)}>Editar</button>
                        <button type="button" className="btn bgh bsm" onClick={() => alternarActivo(e)} disabled={e.id === user.id}>{e.activo === false ? 'Activar' : 'Desactivar'}</button>
                        <button type="button" className="btn bro bsm" onClick={() => eliminar(e)} disabled={!canDeleteEj(user, e.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filas.length > mostrar && <div style={{ textAlign: 'center', marginTop: 12 }}><button type="button" className="btn bgh" onClick={() => setMostrar(m => m + POR_PAGINA)}>Ver {Math.min(POR_PAGINA, filas.length - mostrar)} más</button></div>}

      <Modal open={!!form} onClose={cerrar} title={editId ? 'Editar persona' : 'Nueva persona'}>
        {form && (
          <>
            <div className="fg2">
              <div><label className="flabel" htmlFor="p-nom">Nombre *</label><input id="p-nom" className="finput" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ej. Laura Gómez" autoFocus /></div>
              <div><label className="flabel" htmlFor="p-mail">Correo *</label><input id="p-mail" className="finput" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@proservis.com.co" /></div>
            </div>
            <div className="fg2">
              <div><label className="flabel" htmlFor="p-rol">Rol *</label>
                <select id="p-rol" className="finput" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="usuario">Usuario: aporta datos o lidera informes</option>
                  <option value="admin">Administrador: supervisa a su equipo</option>
                  {esSA && <option value="super_admin">Super admin: administra todo</option>}
                </select>
              </div>
              <div><label className="flabel" htmlFor="p-zona">Zona o ciudad</label><input id="p-zona" className="finput" value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="Ej. Cali" /></div>
            </div>
            <div className="fg2">
              <div><label className="flabel" htmlFor="p-area">Área *</label>
                <select id="p-area" className="finput" value={form.areaId} onChange={e => setForm({ ...form, areaId: e.target.value })}>
                  <option value="">— Elige un área —</option>
                  {areasPermitidas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div><label className="flabel" htmlFor="p-act">Estado</label>
                <select id="p-act" className="finput" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
                  <option value="1">Activa: puede entrar</option><option value="0">Inactiva: no puede entrar</option>
                </select>
              </div>
            </div>
            {areaForm && (
              <div className="alrt avd" style={{ marginTop: 10 }}>
                <strong>{areaForm.nombre}</strong>{(areaForm.modulos || []).length ? ': aportará ' : ': esta área no tiene módulos propios.'}
                {(areaForm.modulos || []).map(id => MODULOS.find(m => m.id === id)?.label || id).join(', ')}
              </div>
            )}
            <div className="alrt aam" style={{ marginTop: 10 }}>No se guardan contraseñas aquí. La persona entra con <strong>Google</strong> usando este mismo correo, o con correo y contraseña si ya tiene cuenta en Firebase Authentication.</div>
            <div className="brow"><button type="button" className="btn bvd" onClick={guardar}>{editId ? 'Guardar cambios' : 'Registrar persona'}</button><button type="button" className="btn bgh" onClick={cerrar}>Cancelar</button></div>
          </>
        )}
      </Modal>
    </div>
  );
}
