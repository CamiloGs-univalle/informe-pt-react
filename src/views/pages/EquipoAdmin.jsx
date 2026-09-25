/**
 * views/pages/EquipoAdmin.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * "Mi equipo" — admin/super_admin page: full Atención al Cliente CRUD (role,
 * password, workspace/area), bulk cliente→ejecutivo assignment, and the
 * team's monthly report-progress view.
 *
 * Rediseño: las personas se muestran agrupadas por área (cada área es su
 * propia "sala", con el color y el ícono que ya tiene en `DB.areas`) en
 * vez de una tabla plana — la lista de "Seguimiento mensual" y la tabla de
 * "Personas" que antes vivían separadas (repitiendo nombre/rol/área) ahora
 * son una sola tarjeta por persona, con su avance, calidad y última
 * actividad. La lógica de datos (CRUD, asignación de clientes, permisos)
 * es exactamente la misma de antes — ver `views/pages/equipo/`.
 */
import { useState, useEffect, useRef } from 'react';
import { getEjs, getUsersForAdmin, saveEj, deleteEj } from '../../models/Ejecutivo';
import { getClis, assignClientesToUser } from '../../models/Cliente';
import { getWorkspaces, getAreas } from '../../models/Workspace';
import { getInfs } from '../../models/Informe';
import { DB } from '../../models/db';
import { ROLE_LABEL } from '../../models/constants';
import { getTeamMonthlyProgress } from '../../controllers/reportingController';
import { useToast } from '../common/useToast';
import Modal from '../common/Modal';
import TeamPod from './equipo/TeamPod';
import { ROLE_COLOR } from './equipo/helpers';

export default function EquipoAdmin({ user }) {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [clis, setClis] = useState([]);
  const [wss, setWss] = useState([]);
  const [areas, setAreas] = useState([]);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', email: '', zona: '', role: 'usuario', workspaceId: 'w1', areaId: 'a1', password: 'Proservis2026', activo: true });
  const [selected, setSelected] = useState(new Set());
  const [targetUser, setTargetUser] = useState('');
  const assignRef = useRef(null);

  const refresh = () => {
    // Admin solo ve su equipo de su área; super_admin ve todo; nunca ve super_admin si no lo es
    const allUsers = user?.role === 'admin' ? getUsersForAdmin(user.id) : getEjs();
    const visible = user?.role !== 'super_admin' ? allUsers.filter(u=> u.role !== 'super_admin') : allUsers;
    setUsers(visible);
    setClis(getClis());
    setWss(getWorkspaces());
    setAreas(getAreas());
  };
  useEffect(() => { refresh(); }, []);

  const progress = getTeamMonthlyProgress(user);
  const allInfs = getInfs();

  const openNew = () => {
    setForm({ nom: '', email: '', zona: '', role: 'usuario', workspaceId: wss[0]?.id || 'w1', areaId: areas[0]?.id || 'a1', password: 'Proservis2026', activo: true });
    setEditId(null); setModal(true);
  };
  const openEdit = (u) => {
    setForm({ nom: u.nom, email: u.email || '', zona: u.zona || '', role: u.role || 'usuario', workspaceId: u.workspaceId || wss[0]?.id, areaId: u.areaId || areas[0]?.id, password: u.password || 'Proservis2026', activo: u.activo !== false });
    setEditId(u.id); setModal(true);
  };
  const handleSave = () => {
    if (!form.nom.trim() || !form.email.trim()) { toast('Nombre y email son obligatorios'); return; }
    if (!form.email.includes('@')) { toast('Email no válido'); return; }
    try {
      saveEj({ ...form, id: editId }, user);
      refresh(); setModal(false); toast('Persona guardada Señor ✓');
    } catch (e) { toast(e.message || 'Error al guardar'); }
  };
  const handleDelete = (id) => {
    const target = users.find(u => u.id === id);
    if (target?.role === 'super_admin' && user?.role !== 'super_admin') { toast('Solo Super Admin puede eliminar Super Admin'); return; }
    if (id === user?.id) { toast('No puedes eliminarte a ti mismo Señor'); return; }
    if (confirm('¿Eliminar persona? Los clientes quedarán sin asignar.')) { deleteEj(id); refresh(); toast('Eliminado Señor'); }
  };

  const toggleCli = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };
  const handleAssign = () => {
    if (!targetUser) { toast('Selecciona el usuario destino'); return; }
    if (selected.size === 0) { toast('Selecciona al menos un cliente'); return; }
    assignClientesToUser(Array.from(selected), targetUser);
    refresh(); setSelected(new Set()); toast(`${selected.size} cliente(s) asignados Señor`);
  };
  // Atajo desde una tarjeta de persona: deja lista la persona destino en el
  // panel de abajo y lleva la vista hasta ahí, en vez de obligar a buscarla
  // otra vez en el selector — la delegación de clientes queda a un clic.
  const quickAssign = (userId) => {
    setTargetUser(userId);
    assignRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Marca abajo los clientes que quieres darle Señor');
  };

  const unassigned = clis.filter(c => !c.ejId);
  const usersForAssign = users.filter(u => ['usuario', 'admin'].includes(u.role));

  // Agrupar por área — cada área es su propia "sala" del equipo, con el
  // color/descripción que ya tiene en DB.areas (pedido explícito: que se
  // sienta como una oficina real, no una tabla plana).
  const filteredProgress = progress.filter(p => !q || p.user.nom.toLowerCase().includes(q.toLowerCase()) || (p.user.email || '').toLowerCase().includes(q.toLowerCase()));
  const areaOrder = areas.map(a => a.id);
  const groupsMap = new Map();
  filteredProgress.forEach(p => {
    const aId = p.user.areaId || '__sin_area__';
    if (!groupsMap.has(aId)) groupsMap.set(aId, []);
    groupsMap.get(aId).push(p);
  });
  const groups = Array.from(groupsMap.entries()).map(([aId, members]) => ({
    area: areas.find(a => a.id === aId) || { id: aId, nombre: 'Sin área asignada', color: '#9AA6A0', descripcion: '' },
    members,
  })).sort((a, b) => {
    const ia = areaOrder.indexOf(a.area.id), ib = areaOrder.indexOf(b.area.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const ratedTeamInfs = allInfs.filter(i => progress.some(p => p.user.id === i.ejId) && i.rating);
  const teamQuality = ratedTeamInfs.length ? (ratedTeamInfs.reduce((s, i) => s + i.rating, 0) / ratedTeamInfs.length) : null;

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>Mi Equipo <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600 }}>Administrador · Seguimiento mensual</span></div>
        <button className="btn bvd" onClick={openNew}>+ Nueva Persona</button>
      </div>
      <div className="ps">Crea personas, delega clientes y mira a tu equipo trabajar — organizado por área, como en la oficina.</div>

      {/* KPIs equipo */}
      <div className="kgrid">
        <div className="kpi"><div className="kl">👥 Personas</div><div className="kv">{users.length}</div><div className="ks">{users.filter(u => u.role === 'usuario').length} usuarios · {users.filter(u => u.role === 'admin').length} admins</div></div>
        <div className="kpi am"><div className="kl">📋 Clientes sin asignar</div><div className="kv">{unassigned.length}</div><div className="ks">de {clis.length} totales</div></div>
        <div className="kpi"><div className="kl">🎯 Avance mes</div><div className="kv">{progress.length ? Math.round(progress.reduce((s, p) => s + p.pct, 0) / progress.length) : 0}%</div><div className="ks">Promedio del equipo</div></div>
        <div className="kpi ro"><div className="kl">⏳ Pendientes</div><div className="kv">{progress.reduce((s, p) => s + p.pend, 0)}</div><div className="ks">Informes faltantes este mes</div></div>
        <div className="kpi"><div className="kl">⭐ Calidad equipo</div><div className="kv" style={{ fontSize: teamQuality ? 26 : 15, color: teamQuality ? undefined : 'var(--grt)' }}>{teamQuality ? teamQuality.toFixed(1) : 'Sin calificar'}</div><div className="ks">Promedio de calificaciones</div></div>
      </div>

      {/* Equipo agrupado por área */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div className="ct" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>🏢 Tu equipo</div>
        <input className="finput" placeholder="Buscar persona..." value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>
      {groups.length === 0 && <div className="card" style={{ textAlign: 'center', color: 'var(--grt)', fontSize: 12 }}>{q ? 'Nadie coincide con esa búsqueda.' : 'No hay equipo aún — crea la primera persona con el botón de arriba.'}</div>}
      {groups.map(g => (
        <TeamPod key={g.area.id} area={g.area} members={g.members} wss={wss} allInfs={allInfs}
          onEdit={openEdit} onDelete={handleDelete} onQuickAssign={quickAssign} />
      ))}

      {/* Asignación masiva */}
      <div className="card" ref={assignRef} style={{ borderLeft: '4px solid #E8BB26' }}>
        <div className="ct">🔗 Asignar clientes a usuarios (muchos → uno)</div>
        {unassigned.length > 0 ? (
          <div className="alrt aam" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>📋</span>
            <span><strong>{unassigned.length}</strong> cliente{unassigned.length !== 1 ? 's' : ''} esperando equipo — selecciónalos abajo y asígnalos a alguien.</span>
          </div>
        ) : (
          <div className="alrt avd" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>🎉</span>
            <span>Todos los clientes tienen un responsable asignado.</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
          <select className="finput" value={targetUser} onChange={e => setTargetUser(e.target.value)} style={{ maxWidth: 240 }}>
            <option value="">— Usuario destino —</option>
            {usersForAssign.map(u => <option key={u.id} value={u.id}>{u.nom} · {u.email} ({ROLE_LABEL[u.role]})</option>)}
          </select>
          <button className="btn bvd bsm" onClick={handleAssign} disabled={!targetUser || selected.size === 0}>Asignar ({selected.size}) →</button>
          <button className="btn bgh bsm" onClick={() => setSelected(new Set())}>Limpiar</button>
          <span style={{ fontSize: 11, color: 'var(--grt)' }}>{selected.size} seleccionados</span>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--grb)', borderRadius: 8 }}>
          <table className="tbl" style={{ margin: 0 }}>
            <thead><tr><th style={{ width: 40 }}><input type="checkbox" checked={selected.size === clis.length && clis.length > 0} onChange={e => setSelected(e.target.checked ? new Set(clis.map(c => c.id)) : new Set())} /></th><th>Cliente</th><th>Asignado a</th><th>Ciudad</th></tr></thead>
            <tbody>
              {clis.map(c => {
                const ej = users.find(u => u.id === c.ejId);
                return (
                  <tr key={c.id} style={{ background: selected.has(c.id) ? 'var(--vc)' : '' }}>
                    <td><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleCli(c.id)} /></td>
                    <td style={{ fontWeight: 600 }}>{c.nom} <span style={{ fontWeight: 400, color: 'var(--grt)', fontSize: 11 }}>{c.marca ? '· ' + c.marca : ''}</span></td>
                    <td>{ej ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 5, background: ROLE_COLOR[ej.role] || ROLE_COLOR.usuario, flexShrink: 0 }} />
                        {ej.nom}
                      </span>
                    ) : <span className="b bbd">Sin asignar</span>}</td>
                    <td style={{ color: 'var(--grt)' }}>{c.ciu || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Persona' : 'Nueva Persona'}>
        <div className="fg2">
          <div><label className="flabel">Nombre *</label><input className="finput" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
          <div><label className="flabel">Email *</label><input className="finput" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@proservis.co" /></div>
        </div>
        <div className="fg2">
          <div><label className="flabel">Rol *</label>
            <select className="finput" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="usuario">Usuario — configura módulos y genera reportes</option>
              <option value="admin">Administrador — crea personas y asigna clientes</option>
              {user?.role === 'super_admin' && <option value="super_admin">Super Admin — crea espacios y áreas</option>}
            </select>
          </div>
          <div><label className="flabel">Zona / Ciudad</label><input className="finput" value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="Bucaramanga" /></div>
        </div>
        <div className="fg2">
          <div><label className="flabel">Espacio</label>
            <select className="finput" value={form.workspaceId} onChange={e => setForm({ ...form, workspaceId: e.target.value })}>
              {wss.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}
            </select>
          </div>
          <div><label className="flabel">Área</label>
            <select className="finput" value={form.areaId} onChange={e => setForm({ ...form, areaId: e.target.value })}>
              {(user?.role==='admin' ? areas.filter(a => a.workspaceId === form.workspaceId && (a.adminId===user.id || a.id===user.areaId)) : areas.filter(a => a.workspaceId === form.workspaceId)).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              {areas.filter(a => a.workspaceId === form.workspaceId).length === 0 && <option value="">— Crea áreas primero —</option>}
            </select>
            {user?.role==='admin' && <div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>Solo puedes crear en tu área: {areas.filter(a=>a.adminId===user.id).map(a=>a.nombre).join(', ') || DB.areas.find(a=>a.id===user.areaId)?.nombre || '—'}</div>}
          </div>
        </div>
        <div className="fg2">
          <div><label className="flabel">Contraseña</label><input className="finput" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Proservis2026" /></div>
          <div><label className="flabel">Estado</label>
            <select className="finput" value={form.activo ? '1' : '0'} onChange={e => setForm({ ...form, activo: e.target.value === '1' })}>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>
        <div className="alrt aam" style={{ marginTop: 12, fontSize: 11 }}>El usuario inicia sesión con su <strong>correo</strong> y esta contraseña. Si usa Firebase, cree también el usuario en Authentication.</div>
        <div className="brow"><button className="btn bvd" onClick={handleSave}>Guardar</button><button className="btn bgh" onClick={() => setModal(false)}>Cancelar</button></div>
      </Modal>
    </div>
  );
}
