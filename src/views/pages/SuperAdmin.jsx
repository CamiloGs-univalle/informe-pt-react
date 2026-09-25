/**
 * views/pages/SuperAdmin.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Super_admin-only: Espacios y Áreas con módulos flexibles y admin por área.
 * El Super Admin (Camilo) es el único que puede crear áreas y asignar jefes.
 */
import { useState, useEffect } from 'react';
import { getWorkspaces, saveWorkspace, deleteWorkspace, getAreas, saveArea, deleteArea } from '../../models/Workspace';
import { getEjs } from '../../models/Ejecutivo';
import { MODULOS } from '../../models/constants';
import { useToast } from '../common/useToast';
import Modal from '../common/Modal';

export default function SuperAdmin() {
  const toast = useToast();
  const [wss, setWss] = useState([]);
  const [areas, setAreas] = useState([]);
  const [mWs, setMWs] = useState(false);
  const [mAr, setMAr] = useState(false);
  const [editW, setEditW] = useState(null);
  const [editA, setEditA] = useState(null);
  const [fw, setFw] = useState({ nombre: '', descripcion: '', color: '#168A43' });
  const [fa, setFa] = useState({ nombre: '', workspaceId: '', color: '#E8BB26', modulos: [], adminId: '', descripcion: '' });

  const refresh = () => { setWss(getWorkspaces()); setAreas(getAreas()); };
  useEffect(() => { refresh(); }, []);

  const openNewW = () => { setFw({ nombre: '', descripcion: '', color: '#168A43' }); setEditW(null); setMWs(true); };
  const openEditW = (w) => { setFw({ nombre: w.nombre, descripcion: w.descripcion || '', color: w.color || '#168A43' }); setEditW(w.id); setMWs(true); };
  const saveW = () => {
    if (!fw.nombre.trim()) return;
    saveWorkspace({ ...fw, id: editW });
    refresh(); setMWs(false); toast('Espacio guardado Señor');
  };
  const delW = (id) => { if (confirm('¿Eliminar espacio y sus áreas?')) { deleteWorkspace(id); refresh(); toast('Espacio eliminado'); } };

  const openNewA = (wsId) => { setFa({ nombre: '', workspaceId: wsId || (wss[0]?.id || ''), color: '#E8BB26', modulos: [], adminId: '', descripcion: '' }); setEditA(null); setMAr(true); };
  const openEditA = (a) => { setFa({ nombre: a.nombre, workspaceId: a.workspaceId, color: a.color || '#E8BB26', modulos: a.modulos || [], adminId: a.adminId || '', descripcion: a.descripcion || '' }); setEditA(a.id); setMAr(true); };
  const saveA = () => {
    if (!fa.nombre.trim() || !fa.workspaceId) return;
    saveArea({ ...fa, id: editA });
    refresh(); setMAr(false); toast('Área guardada Señor');
  };
  const delA = (id) => { if (confirm('¿Eliminar área?')) { deleteArea(id); refresh(); toast('Área eliminada'); } };
  const toggleModulo = (mid) => { setFa(f => ({ ...f, modulos: f.modulos.includes(mid) ? f.modulos.filter(m=>m!==mid) : [...f.modulos, mid] })); };

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Espacios y Áreas <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600, marginLeft: 8 }}>Super Admin — flexible por módulos</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn bgh bsm" onClick={()=>openNewA()}>+ Nueva Área</button>
          <button className="btn bvd bsm" onClick={openNewW}>+ Nuevo Espacio</button>
        </div>
      </div>
      <div className="ps">El Super Admin crea los espacios y sus áreas. Cada área controla uno o varios módulos (selección, SST, etc.) y tiene un jefe (Admin). Mañana puede crear “Calidad” y asignarle módulos sin tocar código.</div>

      <div className="kgrid" style={{ marginBottom: 14 }}>
        <div className="kpi" style={{ borderLeftColor: '#168A43' }}><div className="kl">Espacios</div><div className="kv">{wss.length}</div><div className="ks">Workspaces</div></div>
        <div className="kpi am"><div className="kl">Áreas</div><div className="kv">{areas.length}</div><div className="ks">Flexibles por módulos</div></div>
        <div className="kpi" style={{ borderLeftColor: '#12212D' }}><div className="kl">Modelo</div><div className="kv" style={{ fontSize: 14 }}>Área → Módulos</div><div className="ks">Super Admin configura</div></div>
      </div>

      {wss.map(ws => (
        <div key={ws.id} className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{width:14, height:14, borderRadius:4, background:ws.color, display:'inline-block'}}></span>
              <strong>{ws.nombre}</strong> <span style={{fontSize:11, color:'var(--grt)'}}>{ws.descripcion}</span>
            </div>
            <div style={{display:'flex', gap:6}}>
              <button className="btn bgh bsm" onClick={()=>openEditW(ws)}>Editar</button>
              <button className="btn bro bsm" onClick={()=>delW(ws.id)}>Eliminar</button>
              <button className="btn bvd bsm" onClick={()=>openNewA(ws.id)}>+ Área aquí</button>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:10, marginTop:12}}>
            {areas.filter(a=>a.workspaceId===ws.id).map(a=> (
              <div key={a.id} className="card" style={{margin:0, borderLeft:`4px solid ${a.color}`, padding:'12px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
                  <div>
                    <div style={{fontWeight:800, fontSize:13, color:'var(--tx)'}}>{a.nombre}</div>
                    <div style={{fontSize:11, color:'var(--grt)'}}>{a.descripcion}</div>
                    <div style={{fontSize:11, color:'var(--grt)', marginTop:4}}>{wss.find(w=>w.id===a.workspaceId)?.nombre || ''}</div>
                    <div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>{(a.modulos||[]).map(mid=> MODULOS.find(m=>m.id===mid)?.label || mid).join(' · ') || 'Sin módulos'}</div>
                    {a.adminId && <div style={{fontSize:10, color:'#168A43', fontWeight:700, marginTop:4}}>Jefe: {getEjs().find(e=>e.id===a.adminId)?.nom || a.adminId}</div>}
                  </div>
                  <span style={{width:12, height:12, borderRadius:'50%', background:a.color, flexShrink:0}}></span>
                </div>
                <div style={{display:'flex', gap:6, marginTop:10}}>
                  <button className="btn bgh bsm" onClick={()=>openEditA(a)}>Editar</button>
                  <button className="btn bro bsm" onClick={()=>delA(a.id)}>Eliminar</button>
                </div>
              </div>
            ))}
            {!areas.filter(a=>a.workspaceId===ws.id).length && <div style={{fontSize:12, color:'var(--grt)', padding:'8px 0'}}>Sin áreas — cree la primera.</div>}
          </div>
        </div>
      ))}

      <Modal open={mWs} onClose={()=>setMWs(false)} title={editW?'Editar espacio':'Nuevo espacio'}>
        <div><label className="flabel">Nombre</label><input className="finput" value={fw.nombre} onChange={e=>setFw({...fw, nombre:e.target.value})} /></div>
        <div style={{marginTop:8}}><label className="flabel">Descripción</label><input className="finput" value={fw.descripcion} onChange={e=>setFw({...fw, descripcion:e.target.value})} /></div>
        <div style={{marginTop:8}}><label className="flabel">Color</label><input className="finput" type="color" value={fw.color} onChange={e=>setFw({...fw, color:e.target.value})} /></div>
        <div className="brow" style={{marginTop:12, justifyContent:'end'}}><button className="btn bgh" onClick={()=>setMWs(false)}>Cancelar</button><button className="btn bvd" onClick={saveW}>Guardar</button></div>
      </Modal>

      <Modal open={mAr} onClose={()=>setMAr(false)} title={editA?'Editar área':'Nueva área'}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <div><label className="flabel">Nombre</label><input className="finput" value={fa.nombre} onChange={e=>setFa({...fa, nombre:e.target.value})} placeholder="Ej: SST" /></div>
          <div><label className="flabel">Espacio</label><select className="finput" value={fa.workspaceId} onChange={e=>setFa({...fa, workspaceId:e.target.value})}>{wss.map(w=> <option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
          <div><label className="flabel">Color</label><input className="finput" type="color" value={fa.color} onChange={e=>setFa({...fa, color:e.target.value})} /></div>
          <div><label className="flabel">Admin del área (jefe)</label><select className="finput" value={fa.adminId} onChange={e=>setFa({...fa, adminId:e.target.value})}><option value="">— Sin admin —</option>{getEjs().map(e=> <option key={e.id} value={e.id}>{e.nom} · {e.email}</option>)}</select></div>
          <div style={{gridColumn:'1 / -1'}}><label className="flabel">Descripción</label><input className="finput" value={fa.descripcion} onChange={e=>setFa({...fa, descripcion:e.target.value})} placeholder="Ej: Psicólogos - selección" /></div>
          <div style={{gridColumn:'1 / -1'}}><label className="flabel">Módulos que controla esta área (flexible)</label><div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:4}}>{MODULOS.map(m=> <label key={m.id} style={{display:'flex', alignItems:'center', gap:4, fontSize:11, background: fa.modulos.includes(m.id)?'#E8F5EE':'#F2F4F2', padding:'4px 8px', borderRadius:20, border: fa.modulos.includes(m.id)?'1px solid #168A43':'1px solid #DDE4DD'}}><input type="checkbox" checked={fa.modulos.includes(m.id)} onChange={()=>toggleModulo(m.id)} /> {m.icon} {m.label}</label>)}</div><div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>Si mañana crea “Calidad”, solo marque sus módulos y asigne jefe — sin código.</div></div>
        </div>
        <div className="brow" style={{marginTop:12, justifyContent:'end'}}><button className="btn bgh" onClick={()=>setMAr(false)}>Cancelar</button><button className="btn bvd" onClick={saveA}>Guardar área</button></div>
      </Modal>
    </div>
  );
}
