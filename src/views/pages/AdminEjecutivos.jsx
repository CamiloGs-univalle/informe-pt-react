/**
 * Personas — Rediseño Premium Creativo
 * Lógica: Admin crea y queda auto-asignado a su área; Super Admin ve todo y puede reasignar
 */
import { useState, useEffect, useMemo } from 'react';
import { getEjs, saveEj, deleteEj, getUsersForAdmin } from '../../models/Ejecutivo';
import { getCliCountForEj } from '../../models/Cliente';
import { getInfCountForEj } from '../../models/Informe';
import { getAreas } from '../../models/Workspace';
import { getModuloConfig } from '../../models/ModuloConfig';
import { MODULOS, ROLE_LABEL } from '../../models/constants';
import { DB } from '../../models/db';
import Modal from '../common/Modal';
import { useToast } from '../common/useToast';

export default function AdminEjecutivos({ user }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroArea, setFiltroArea] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [vista, setVista] = useState('cards');
  const [list, setList] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({ nom: '', email: '', zona: '', role: 'usuario', areaId: '', workspaceId: 'w1', password: 'Proservis2026' });
  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';

  const refresh = () => {
    const all = getEjs();
    // Admin solo ve su área, Super ve todo
    const visible = isSuper ? all : isAdmin ? getUsersForAdmin(user.id) : all.filter(u=> u.id===user.id);
    // Pero para el admin que es jefe, getUsersForAdmin ya filtra por área y oculta super_admin
    // Para usuario normal que entra por error, mostrar solo él
    const finalList = isSuper ? all : visible.length? visible : all.filter(u=> u.id===user.id);
    // Si es admin y no es super, ocultar super_admin (ya lo hace getUsersForAdmin)
    setList(finalList);
    setAreas(getAreas());
  };
  useEffect(() => { refresh(); }, [user]);

  const myArea = DB.areas.find(a=> a.id===user?.areaId);
  const canChooseArea = isSuper;
  const defaultAreaForNew = isAdmin && myArea ? myArea.id : (areas[0]?.id || 'a1');

  const openNew = () => {
    setForm({
      nom: '', email: '', zona: '', role: 'usuario',
      areaId: canChooseArea ? (areas[0]?.id || 'a1') : defaultAreaForNew,
      workspaceId: user?.workspaceId || 'w1', password: 'Proservis2026'
    });
    setEditId(null); setModal(true);
  };
  const openEdit = (e) => {
    setForm({
      nom: e.nom, email: e.email || '', zona: e.zona || '', role: e.role || 'usuario',
      areaId: e.areaId || defaultAreaForNew, workspaceId: e.workspaceId || 'w1', password: e.password || 'Proservis2026'
    });
    setEditId(e.id); setModal(true);
  };

  const handleSave = () => {
    if (!form.nom.trim() || !form.email.trim()) { toast('Nombre y email son obligatorios Señor'); return; }
    if (!form.email.includes('@')) { toast('Email no válido'); return; }
    // Admin: forzar su área si intenta crear fuera
    let finalForm = { ...form, id: editId };
    if (!canChooseArea) {
      finalForm.areaId = myArea?.id || defaultAreaForNew;
      finalForm.workspaceId = user.workspaceId;
      if (form.role === 'super_admin') { toast('Solo Super Admin puede crear Super Admin'); return; }
    }
    try {
      saveEj(finalForm, user);
      refresh(); setModal(false); toast('Persona guardada Señor ✓');
    } catch (e) { toast(e.message || 'Error'); }
  };
  const handleDelete = (id) => {
    const target = getEjs().find(u=>u.id===id);
    if (target?.role==='super_admin' && !isSuper) { toast('No puedes eliminar Super Admin'); return; }
    if (confirm('¿Eliminar esta persona?')) { deleteEj(id); refresh(); toast('Eliminado'); }
  };

  const enriched = useMemo(()=> list.map(e=> {
    const area = areas.find(a=>a.id===e.areaId);
    const modulos = (()=> {
      if (area?.modulos?.length) return area.modulos;
      const cfg = getModuloConfig(e.id);
      return Object.entries(cfg||{}).filter(([,v])=>v).map(([k])=>k);
    })();
    const nclis = getCliCountForEj(e.id);
    const ninfs = getInfCountForEj(e.id);
    return { e, area, modulos, nclis, ninfs };
  }), [list, areas]);

  const filtered = useMemo(()=> {
    let l = enriched.filter(({e})=> !search || e.nom.toLowerCase().includes(search.toLowerCase()) || (e.email||'').toLowerCase().includes(search.toLowerCase()) || (e.zona||'').toLowerCase().includes(search.toLowerCase()));
    if (filtroArea!=='todos') l = l.filter(({e})=> e.areaId===filtroArea);
    if (filtroRol!=='todos') l = l.filter(({e})=> e.role===filtroRol);
    return l;
  }, [enriched, search, filtroArea, filtroRol]);

  const stats = useMemo(()=> {
    const total = enriched.length;
    const porArea = areas.map(a=> ({ id:a.id, nombre:a.nombre, color:a.color, count: enriched.filter(x=> x.e.areaId===a.id).length }));
    const sinArea = enriched.filter(x=> !x.e.areaId).length;
    return { total, porArea, sinArea };
  }, [enriched, areas]);

  return (
    <div>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#0F1F2E 0%, #1A3A2A 45%, #12212D 100%)', borderRadius:16, padding:'18px 20px', color:'#fff', position:'relative', overflow:'hidden', marginBottom:14}}>
        <div style={{position:'absolute', top:-24, right:40, width:160, height:160, background:'rgba(232,187,38,.12)', borderRadius:'50%'}} />
        <div style={{position:'absolute', bottom:-20, left:-30, width:120, height:120, background:'rgba(255,255,255,.06)', borderRadius:'50%'}} />
        <div style={{position:'relative'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap:12}}>
            <div>
              <div style={{fontSize:18, fontWeight:900, display:'flex', alignItems:'center', gap:8}}>Personas <span style={{background:'rgba(255,255,255,.12)', padding:'4px 10px', borderRadius:20, fontSize:11, border:'1px solid rgba(255,255,255,.18)'}}>{stats.total} personas</span> {isAdmin && !isSuper && <span style={{background:'#E8BB26', color:'#12212D', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:800}}>Tu área: {myArea?.nombre}</span>}</div>
              <div style={{fontSize:11, opacity:.8, marginTop:4}}>
                {isSuper ? 'Ves todas las áreas — puedes reasignar si quedó mal creado' : `Ves solo ${myArea?.nombre || 'tu área'} — al crear, queda automáticamente en tu área`}
              </div>
            </div>
            <button onClick={openNew} style={{background:'linear-gradient(135deg,#E8BB26,#F5D76E)', color:'#12212D', fontWeight:900, padding:'10px 16px', borderRadius:12, border:'none', boxShadow:'0 4px 12px rgba(232,187,38,.25)', display:'flex', gap:6, alignItems:'center', cursor:'pointer'}}>
              <span style={{width:20, height:20, borderRadius:'50%', background:'#12212D', color:'#E8BB26', display:'grid', placeItems:'center', fontSize:12}}>+</span> Nueva Persona {isAdmin && !isSuper ? `en ${myArea?.nombre}` : ''}
            </button>
          </div>
          <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.min(areas.length,4)},1fr)`, gap:8, marginTop:14}}>
            {stats.porArea.slice(0,4).map(a=> (
              <div key={a.id} style={{background: a.count? 'rgba(255,255,255,.10)':'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'10px 12px', borderLeft:`3px solid ${a.color || '#E8BB26'}`}}>
                <div style={{fontSize:10, opacity:.7, fontWeight:700, textTransform:'uppercase'}}>{a.nombre}</div>
                <div style={{fontSize:18, fontWeight:900}}>{a.count}</div>
                <div style={{fontSize:10, opacity:.65}}>{a.count===1?'persona':'personas'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', background:'rgba(255,255,255,.9)', backdropFilter:'blur(8px)', border:'1px solid #E6EBE6', borderRadius:14, padding:'12px 14px', position:'sticky', top:8, zIndex:2, boxShadow:'0 4px 12px rgba(0,0,0,.04)'}}>
        <div style={{position:'relative', flex:1, minWidth:220}}>
          <span style={{position:'absolute', left:12, top:9, color:'var(--grt)'}}>🔍</span>
          <input type="text" placeholder="Buscar por nombre, email o zona..." value={search} onChange={e=> setSearch(e.target.value)} style={{width:'100%', height:36, borderRadius:10, border:'1px solid #E6EBE6', background:'#F8FAF8', padding:'0 12px 0 34px', fontSize:13, outline:'none'}} />
        </div>
        <select value={filtroArea} onChange={e=> setFiltroArea(e.target.value)} style={{height:36, borderRadius:10, border:'1px solid #E6EBE6', background:'#fff', padding:'0 10px', fontSize:12, fontWeight:600}}>
          <option value="todos">Todas las áreas ({stats.total})</option>
          {areas.map(a=> <option key={a.id} value={a.id}>{a.nombre} ({stats.porArea.find(x=>x.id===a.id)?.count||0})</option>)}
        </select>
        <select value={filtroRol} onChange={e=> setFiltroRol(e.target.value)} style={{height:36, borderRadius:10, border:'1px solid #E6EBE6', background:'#fff', padding:'0 10px', fontSize:12, fontWeight:600}}>
          <option value="todos">Todos los roles</option>
          <option value="usuario">Usuario</option>
          <option value="admin">Administrador</option>
          {isSuper && <option value="super_admin">Super Admin</option>}
        </select>
        <div style={{display:'flex', background:'#F2F4F2', borderRadius:10, padding:3, border:'1px solid #E6EBE6'}}>
          <button onClick={()=> setVista('cards')} style={{background: vista==='cards'?'#fff':'transparent', border:'1px solid '+(vista==='cards'?'#E6EBE6':'transparent'), padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700}}>⊞ Cards</button>
          <button onClick={()=> setVista('table')} style={{background: vista==='table'?'#fff':'transparent', border:'1px solid '+(vista==='table'?'#E6EBE6':'transparent'), padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700}}>☰ Tabla</button>
        </div>
      </div>

      {vista==='cards' ? (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12, marginTop:14}}>
          {filtered.map(({e, area, modulos, nclis, ninfs}) => {
            const color = area?.color || '#E6EBE6';
            const pct = nclis? Math.min(100, Math.round(ninfs/nclis*100)):0;
            return (
              <div key={e.id} style={{background:'#fff', border:'1px solid #E6EBE6', borderRadius:14, padding:14, boxShadow:'0 2px 8px rgba(0,0,0,.04)', borderTop:`3px solid ${color}`, position:'relative', overflow:'hidden', transition:'transform .2s, box-shadow .2s'}} onMouseEnter={el=>{el.currentTarget.style.transform='translateY(-3px)'; el.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.08)'}} onMouseLeave={el=>{el.currentTarget.style.transform=''; el.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'}}>
                <div style={{position:'absolute', top:-20, right:-20, width:80, height:80, background: color, opacity:.06, borderRadius:'50%'}} />
                <div style={{display:'flex', gap:10, alignItems:'start', position:'relative'}}>
                  <div style={{width:44, height:44, borderRadius:10, background: `linear-gradient(135deg, ${color}18, ${color}08)`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color: color, flexShrink:0}}>{e.nom.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontWeight:800, fontSize:13, color:'#0F1F2E', display:'flex', alignItems:'center', gap:6}}>{e.nom} {!e.activo && <span style={{fontSize:9, background:'#FFF5F5', color:'#8B1A1A', padding:'2px 6px', borderRadius:20, border:'1px solid #F5C6CB'}}>Inactivo</span>}</div>
                    <div style={{fontSize:11, color:'var(--grt)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{e.email}</div>
                    <div style={{display:'flex', gap:4, marginTop:6, flexWrap:'wrap'}}>
                      <span style={{fontSize:9, padding:'3px 7px', borderRadius:20, background: e.role==='super_admin'?'#12212D': e.role==='admin'?'#E8F5EE':'#FDF6D8', color: e.role==='super_admin'?'#fff': e.role==='admin'?'#0F6B33':'#7A6010', fontWeight:700, border:'1px solid #E6EBE6'}}>{ROLE_LABEL[e.role]}</span>
                      <span style={{fontSize:9, padding:'3px 7px', borderRadius:20, background: color, color:'#fff', fontWeight:700}}>{area?.nombre || 'Sin área'}</span>
                    </div>
                  </div>
                  <span style={{fontSize:10, background:'#F2F4F2', padding:'4px 8px', borderRadius:20, border:'1px solid #E6EBE6', fontWeight:700, color:'var(--grt)'}}>{e.zona || '—'}</span>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12}}>
                  <div style={{background:'#F8FAF8', border:'1px solid #F0F0F0', borderRadius:10, padding:'8px 10px', textAlign:'center'}}>
                    <div style={{fontSize:16, fontWeight:900, color:'#0F6B33'}}>{nclis}</div>
                    <div style={{fontSize:9, color:'var(--grt)', fontWeight:700, textTransform:'uppercase'}}>Clientes</div>
                    <div style={{height:3, background:'#E6EBE6', borderRadius:10, marginTop:6, overflow:'hidden'}}><div style={{width: Math.min(100, nclis*10)+'%', height:'100%', background: color, borderRadius:10}} /></div>
                  </div>
                  <div style={{background:'#FFFEF5', border:'1px solid #FFE082', borderRadius:10, padding:'8px 10px', textAlign:'center'}}>
                    <div style={{fontSize:16, fontWeight:900, color:'#B77900'}}>{ninfs}</div>
                    <div style={{fontSize:9, color:'var(--grt)', fontWeight:700, textTransform:'uppercase'}}>Informes</div>
                    <div style={{fontSize:10, fontWeight:800, color: pct===100?'#0F6B33': pct>=50?'#7A6010':'#8B1A1A', marginTop:2}}>{pct}%</div>
                  </div>
                </div>

                <div style={{marginTop:10, background:'#FBFDFB', border:'1px solid #F0F0F0', borderRadius:10, padding:'8px 10px'}}>
                  <div style={{fontSize:9, color:'var(--grt)', fontWeight:700, textTransform:'uppercase', letterSpacing:.04+'em'}}>Módulos</div>
                  <div style={{display:'flex', gap:4, flexWrap:'wrap', marginTop:6}}>
                    {(modulos.length? modulos.slice(0,4): ['sin módulos']).map(m=> {
                      const mod = MODULOS.find(x=>x.id===m);
                      return <span key={m} style={{fontSize:10, background:'#fff', border:'1px solid #E6EBE6', padding:'3px 7px', borderRadius:20, display:'flex', gap:4, alignItems:'center'}}>{mod?.icon||'•'} {mod?.label||m}</span>
                    })}
                    {modulos.length>4 && <span style={{fontSize:10, color:'var(--grt)'}}>+{modulos.length-4}</span>}
                  </div>
                </div>

                <div style={{display:'flex', gap:6, marginTop:12}}>
                  <button onClick={()=> openEdit(e)} style={{flex:1, background:'#fff', border:'1px solid #E6EBE6', borderRadius:10, padding:'8px 10px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer'}}>
                    <span style={{width:18, height:18, borderRadius:'50%', background:'#FFF8E1', border:'1px solid #FFE082', display:'grid', placeItems:'center', fontSize:10}}>✎</span> Editar
                  </button>
                  <button onClick={()=> handleDelete(e.id)} style={{width:36, height:36, borderRadius:10, background:'#FFF5F5', border:'1px solid #F5C6CB', display:'grid', placeItems:'center', cursor:'pointer', color:'#C0392B'}}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{background:'#fff', border:'1px solid #E6EBE6', borderRadius:14, overflow:'hidden', marginTop:14}}>
          <table className="tbl" style={{margin:0}}>
            <thead><tr><th>Persona</th><th>Área</th><th>Rol</th><th>Zona</th><th>Clientes</th><th>Informes</th><th>Módulos</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(({e, area, modulos, nclis, ninfs})=> (
                <tr key={e.id}>
                  <td><div style={{display:'flex', gap:8, alignItems:'center'}}><div style={{width:28, height:28, borderRadius:8, background: area?.color || '#E6EBE6', color:'#fff', display:'grid', placeItems:'center', fontWeight:800, fontSize:11}}>{e.nom.slice(0,2).toUpperCase()}</div><div><div style={{fontWeight:700, fontSize:12}}>{e.nom}</div><div style={{fontSize:11, color:'var(--grt)'}}>{e.email}</div></div></div></td>
                  <td><span style={{background: area?.color || '#E6EBE6', color:'#fff', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700}}>{area?.nombre || '—'}</span></td>
                  <td><span style={{background: e.role==='super_admin'?'#12212D': e.role==='admin'?'#E8F5EE':'#FDF6D8', color: e.role==='super_admin'?'#fff': e.role==='admin'?'#0F6B33':'#7A6010', padding:'3px 7px', borderRadius:20, fontSize:11, fontWeight:700}}>{ROLE_LABEL[e.role]}</span></td>
                  <td>{e.zona||'—'}</td>
                  <td><span className="b bok">{nclis}</span></td>
                  <td><span className="b bwn">{ninfs}</span></td>
                  <td style={{fontSize:10, maxWidth:160}}>{modulos.slice(0,2).map(m=> MODULOS.find(x=>x.id===m)?.label || m).join(', ') || '—'}</td>
                  <td><button className="btn bgh bsm" onClick={()=> openEdit(e)}>✏️</button> <button className="btn bro bsm" onClick={()=> handleDelete(e.id)}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Persona' : `Nueva Persona ${!canChooseArea ? `en ${myArea?.nombre}` : ''}`}>
        {!canChooseArea && (
          <div style={{background:'#E8F5EE', border:'1px solid #C8E6D4', borderRadius:10, padding:'10px 12px', marginBottom:12, display:'flex', gap:8, alignItems:'center'}}>
            <span style={{width:28, height:28, borderRadius:8, background: myArea?.color || '#168A43', color:'#fff', display:'grid', placeItems:'center', fontWeight:800}}>{myArea?.nombre?.slice(0,1) || 'A'}</span>
            <div>
              <div style={{fontWeight:800, fontSize:12, color:'#0F6B33'}}>Se creará en tu área: {myArea?.nombre}</div>
              <div style={{fontSize:11, color:'var(--grt)'}}>Quedará automáticamente asignado a {myArea?.nombre} — no puedes cambiarlo</div>
            </div>
          </div>
        )}
        <div className="fg2">
          <div><label className="flabel">Nombre *</label><input className="finput" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ej: Laura Gómez" /></div>
          <div><label className="flabel">Email *</label><input className="finput" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@proservis.co" /></div>
        </div>
        <div className="fg2">
          <div><label className="flabel">Rol *</label>
            <select className="finput" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="usuario">Usuario — genera reportes</option>
              <option value="admin">Administrador — jefe de área</option>
              {isSuper && <option value="super_admin">Super Admin — crea áreas</option>}
            </select>
          </div>
          <div><label className="flabel">Zona / Ciudad</label><input className="finput" value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })} placeholder="Bucaramanga" /></div>
        </div>
        <div className="fg2">
          <div><label className="flabel">Espacio</label>
            <select className="finput" value={form.workspaceId} onChange={e => setForm({ ...form, workspaceId: e.target.value })} disabled={!canChooseArea}>
              {areas.filter(a=> !a.workspaceId || a.workspaceId===form.workspaceId).length? null: null}
              {[...new Set(areas.map(a=>a.workspaceId))].map(wsId=> {
                const wsName = wsId==='w1'?'Proservis Temporales':'Proservis Outsourcing';
                return <option key={wsId} value={wsId}>{wsName}</option>
              })}
            </select>
          </div>
          <div><label className="flabel">Área {canChooseArea? '':' (auto)'} </label>
            <select className="finput" value={form.areaId} onChange={e => setForm({ ...form, areaId: e.target.value })} disabled={!canChooseArea} style={{background: !canChooseArea?'#F2F4F2':'#fff'}}>
              {areas.filter(a => canChooseArea || a.id===myArea?.id).map(a => <option key={a.id} value={a.id}>{a.nombre} — {a.modulos?.slice(0,2).join(', ')}</option>)}
            </select>
            {!canChooseArea && <div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>Super Admin puede cambiarlo después si quedó mal</div>}
            {canChooseArea && <div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>Como Super Admin puedes moverla a cualquier área</div>}
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
        <div style={{background:'#FBFDFB', border:'1px solid #E6EBE6', borderRadius:10, padding:10, marginTop:12}}>
          <div style={{fontSize:11, fontWeight:800, color:'var(--vd)', marginBottom:6}}>Panorama de módulos (tendrá acceso a)</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {(areas.find(a=>a.id===form.areaId)?.modulos || []).map(mid=> {
              const m = MODULOS.find(x=>x.id===mid);
              return <span key={mid} style={{fontSize:11, background:'#E8F5EE', border:'1px solid #C8E6D4', padding:'4px 8px', borderRadius:20, display:'flex', gap:4, alignItems:'center'}}>{m?.icon} {m?.label}</span>
            })}
            {!(areas.find(a=>a.id===form.areaId)?.modulos?.length) && <span style={{fontSize:11, color:'var(--grt)'}}>Sin módulos asignados a esta área</span>}
          </div>
        </div>
        <div className="brow"><button className="btn bvd" onClick={handleSave}>Guardar</button><button className="btn bgh" onClick={() => setModal(false)}>Cancelar</button></div>
      </Modal>
    </div>
  );
}
