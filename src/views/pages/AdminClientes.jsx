/**
 * Gestionar Clientes — Ultra Creativo Premium
 * Diseño pro, intuitivo, con micro-animaciones y feeling de alta gama
 */
import { useState, useEffect, useMemo } from 'react';
import { getClis, saveCli, deleteCli, asignarAreaACliente } from '../../models/Cliente';
import { getEjs } from '../../models/Ejecutivo';
import Modal from '../common/Modal';
import { useToast } from '../common/useToast';

export default function AdminClientes() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filtroArea, setFiltroArea] = useState('todos');
  const [vista, setVista] = useState('cards');
  const [list, setList] = useState([]);
  const [ejs, setEjs] = useState([]);
  const [form, setForm] = useState({ nom: '', marca: '', nit: '', ciu: '', sec: '', ejId: '', driveFolder: '', selId: '', sstId: '', logo: '' });
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => { setList(getClis()); setEjs(getEjs()); setTimeout(()=> setAnimIn(true), 60); }, []);

  const openNew = () => { setForm({ nom: '', marca: '', nit: '', ciu: '', sec: '', ejId: '', driveFolder: '', selId: '', sstId: '', logo: '' }); setEditId(null); setModal(true); };
  const openEdit = (c) => {
    setForm({
      nom: c.nom, marca: c.marca || '', nit: c.nit || '', ciu: c.ciu || '', sec: c.sec || '', ejId: c.ejId || '', driveFolder: c.driveFolder || '', logo: c.logo || '',
      selId: c.asignaciones?.['a1'] || '', sstId: c.asignaciones?.['a2'] || ''
    });
    setEditId(c.id); setModal(true);
  };
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800*1024) { toast('Logo muy grande — máximo 800KB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };
  const handleSave = () => {
    if (!form.nom.trim()) { toast('Nombre requerido'); return; }
    const saved = saveCli({ nom: form.nom, marca: form.marca, nit: form.nit, ciu: form.ciu, sec: form.sec, ejId: form.ejId, driveFolder: form.driveFolder, logo: form.logo || null, id: editId });
    const id = saved.id || editId;
    asignarAreaACliente(id, 'a1', form.selId || null);
    asignarAreaACliente(id, 'a2', form.sstId || null);
    setList(getClis());
    setModal(false);
    toast('Cliente guardado con trío Atención al Cliente/Selección/SST Señor ✓');
  };
  const handleDelete = (id) => {
    if (confirm('¿Eliminar este cliente?')) { deleteCli(id); setList(getClis()); toast('Eliminado'); }
  };

  const selUsers = ejs.filter(e=> e.areaId==='a1');
  const sstUsers = ejs.filter(e=> e.areaId==='a2');

  const stats = useMemo(()=> {
    const total = list.length;
    const conTrio = list.filter(c=> c.ejId && c.asignaciones?.['a1'] && c.asignaciones?.['a2']).length;
    const sinLogo = list.filter(c=> !c.logo).length;
    const pct = total? Math.round(conTrio/total*100):0;
    return { total, conTrio, sinLogo, pct };
  }, [list]);

  const filtered = useMemo(()=> {
    let l = list.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || (c.marca||'').toLowerCase().includes(search.toLowerCase()) || (c.nit||'').includes(search));
    if (filtroArea==='sinTrio') l = l.filter(c=> !(c.ejId && c.asignaciones?.['a1'] && c.asignaciones?.['a2']));
    if (filtroArea==='sinLogo') l = l.filter(c=> !c.logo);
    if (filtroArea==='a1') l = l.filter(c=> !c.asignaciones?.['a1']);
    if (filtroArea==='a2') l = l.filter(c=> !c.asignaciones?.['a2']);
    return l;
  }, [list, search, filtroArea]);

  return (
    <div>
      {/* Header con glass + gradiente + patrón sutil */}
      <div style={{
        background:'radial-gradient(800px 400px at 10% 0%, rgba(232,187,38,.18), transparent 60%), linear-gradient(135deg,#0B1E2A 0%, #143A5A 45%, #168A43 100%)',
        borderRadius:18, padding:'22px 22px', color:'#fff', position:'relative', overflow:'hidden', marginBottom:14,
        transform: animIn?'translateY(0) scale(1)':'translateY(10px) scale(.98)', opacity: animIn?1:0, transition:'all .6s cubic-bezier(.2,.8,.2,1)', boxShadow:'0 10px 30px rgba(0,0,0,.12)'
      }}>
        <div style={{position:'absolute', inset:0, background:'radial-gradient(600px 200px at 90% 100%, rgba(255,255,255,.06), transparent)', pointerEvents:'none'}} />
        <div style={{position:'absolute', top:-30, right:60, width:160, height:160, background:'rgba(232,187,38,.10)', borderRadius:'50%', filter:'blur(2px)'}} />
        <div style={{position:'relative', display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap:12}}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span style={{width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#E8BB26,#F5D76E)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#12212D', boxShadow:'0 4px 12px rgba(232,187,38,.4)'}}>◆</span>
              <div>
                <div style={{fontSize:18, fontWeight:900, letterSpacing:.01+'em', display:'flex', alignItems:'center', gap:8}}>Gestionar Clientes <span style={{background:'rgba(255,255,255,.12)', backdropFilter:'blur(6px)', padding:'4px 10px', borderRadius:20, fontSize:11, border:'1px solid rgba(255,255,255,.18)', fontWeight:700}}>Trío pro</span></div>
                <div style={{fontSize:11, opacity:.85, marginTop:3}}>Atención al Cliente (lidera) + Selección (psicólogo) + SST — con logo, se ve premium en el informe</div>
              </div>
            </div>
          </div>
          <button onClick={openNew} style={{background:'linear-gradient(135deg,#E8BB26,#F5D76E)', color:'#12212D', fontWeight:900, padding:'11px 18px', borderRadius:12, border:'none', boxShadow:'0 6px 16px rgba(232,187,38,.35)', display:'flex', alignItems:'center', gap:8, cursor:'pointer', transition:'transform .15s'}}>
            <span style={{width:22, height:22, borderRadius:'50%', background:'#12212D', color:'#E8BB26', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, lineHeight:1}}>+</span> Nuevo Cliente
          </button>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:16, position:'relative'}}>
          {[
            {k:'Total', v: stats.total, sub:'Clientes', grad:'linear-gradient(135deg,rgba(255,255,255,.14), rgba(255,255,255,.06))'},
            {k:'Trío completo', v: `${stats.conTrio}`, sub:`${stats.pct}%`, grad: stats.pct===100?'linear-gradient(135deg,rgba(232,187,38,.28), rgba(232,187,38,.08))':'linear-gradient(135deg,rgba(255,255,255,.10), rgba(255,255,255,.06))', bar: stats.pct},
            {k:'Sin logo', v: stats.sinLogo, sub:'Requieren imagen', grad:'linear-gradient(135deg,rgba(255,255,255,.10), rgba(255,255,255,.06))'},
            {k:'Equipo', v: `${selUsers.length} · ${sstUsers.length}`, sub:'a1 Selección · a2 SST', grad:'linear-gradient(135deg,rgba(255,255,255,.10), rgba(255,255,255,.06))'},
          ].map(card=> (
            <div key={card.k} style={{background: card.grad, border:'1px solid rgba(255,255,255,.14)', borderRadius:12, padding:'12px', backdropFilter:'blur(8px)', position:'relative', overflow:'hidden'}}>
              <div style={{fontSize:10, opacity:.7, fontWeight:800, textTransform:'uppercase', letterSpacing:.06+'em'}}>{card.k}</div>
              <div style={{fontSize:20, fontWeight:900, marginTop:2}}>{card.v}</div>
              <div style={{fontSize:10, opacity:.7}}>{card.sub}</div>
              {card.bar!==undefined && <div style={{height:4, background:'rgba(255,255,255,.18)', borderRadius:10, marginTop:8, overflow:'hidden'}}><div style={{width: card.bar+'%', height:'100%', background:'linear-gradient(90deg,#E8BB26,#F5D76E)', borderRadius:10, transition:'width .6s ease'}} /></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Filtros con glass morph */}
      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', padding:'12px 14px', background:'rgba(255,255,255,.85)', backdropFilter:'blur(10px)', border:'1px solid #E6EBE6', borderRadius:14, position:'sticky', top:8, zIndex:2, boxShadow:'0 4px 16px rgba(0,0,0,.06)'}}>
        <div style={{position:'relative', flex:1, minWidth:240}}>
          <span style={{position:'absolute', left:12, top:9, color:'var(--grt)', fontSize:13}}>⌕</span>
          <input type="text" placeholder="Buscar por nombre, marca, NIT o ciudad..." value={search} onChange={e => setSearch(e.target.value)} style={{width:'100%', height:36, borderRadius:10, border:'1px solid #E6EBE6', background:'#F8FAF8', padding:'0 12px 0 34px', fontSize:13, outline:'none', transition:'all .2s'}} onFocus={e=> e.target.style.background='#fff'} onBlur={e=> e.target.style.background='#F8FAF8'} />
        </div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          {[
            {id:'todos', label:'Todos'},
            {id:'sinTrio', label:'Sin trío'},
            {id:'sinLogo', label:'Sin logo'},
            {id:'a1', label:'Sin Selección'},
            {id:'a2', label:'Sin SST'},
          ].map(chip=> (
            <button key={chip.id} onClick={()=> setFiltroArea(chip.id)} style={{
              padding:'7px 12px', borderRadius:20, fontSize:11, fontWeight:800, border:'1px solid '+(filtroArea===chip.id?'#168A43':'#E6EBE6'),
              background: filtroArea===chip.id?'linear-gradient(135deg,#E8F5EE,#E8F5EE)':'#fff', color: filtroArea===chip.id?'#0F6B33':'var(--grt)',
              boxShadow: filtroArea===chip.id?'0 2px 8px rgba(22,138,67,.12)':'', cursor:'pointer', transition:'all .15s'
            }}>{chip.label}</button>
          ))}
        </div>
        <div style={{display:'flex', background:'#F2F4F2', borderRadius:10, padding:3, border:'1px solid #E6EBE6', marginLeft:'auto'}}>
          <button onClick={()=> setVista('cards')} style={{background: vista==='cards'?'#fff':'transparent', border:'1px solid '+(vista==='cards'?'#E6EBE6':'transparent'), padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:800, boxShadow: vista==='cards'?'0 2px 8px rgba(0,0,0,.06)':'', display:'flex', gap:6, alignItems:'center'}}><span>⊞</span> Cards</button>
          <button onClick={()=> setVista('table')} style={{background: vista==='table'?'#fff':'transparent', border:'1px solid '+(vista==='table'?'#E6EBE6':'transparent'), padding:'7px 12px', borderRadius:8, fontSize:12, fontWeight:800}}>☰ Tabla</button>
        </div>
        <span style={{fontSize:11, color:'var(--grt)', background:'#fff', padding:'6px 10px', borderRadius:20, border:'1px solid #E6EBE6'}}>{filtered.length} / {list.length}</span>
      </div>

      {vista==='cards' ? (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px,1fr))', gap:14, marginTop:14}}>
          {filtered.slice(0,30).map(c => {
            const ej = ejs.find(e => e.id === c.ejId);
            const sel = ejs.find(e => e.id === c.asignaciones?.['a1']);
            const sst = ejs.find(e => e.id === c.asignaciones?.['a2']);
            const completo = c.ejId && sel && sst && c.logo;
            const score = (c.ejId?1:0)+(sel?1:0)+(sst?1:0)+(c.logo?1:0); // 0-4
            return (
              <div key={c.id} style={{
                background:'linear-gradient(180deg,#FFFFFF 0%, #FBFDFB 100%)', border:'1px solid '+(completo?'#C8E6D4':'#E6EBE6'), borderRadius:16, padding:0, overflow:'hidden',
                boxShadow: completo?'0 4px 16px rgba(22,138,67,.08)':'0 2px 10px rgba(0,0,0,.04)', position:'relative',
                transform:'translateY(0)', transition:'all .25s cubic-bezier(.2,.8,.2,1)'
              }}
              onMouseEnter={e=> {e.currentTarget.style.transform='translateY(-4px) scale(1.01)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(0,0,0,.10)'; e.currentTarget.style.borderColor=completo?'#168A43':'#DDE4DD'}}
              onMouseLeave={e=> {e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=completo?'0 4px 16px rgba(22,138,67,.08)':'0 2px 10px rgba(0,0,0,.04)'; e.currentTarget.style.borderColor=completo?'#C8E6D4':'#E6EBE6'}}>
                {/* Top accent */}
                <div style={{height:4, background: completo?'linear-gradient(90deg,#168A43,#2ECC71)': score>=3?'linear-gradient(90deg,#E8BB26,#F5D76E)':'linear-gradient(90deg,#E6EBE6,#F0F0F0)'}} />
                <div style={{padding:14}}>
                  <div style={{display:'flex', gap:12, alignItems:'start'}}>
                    <div style={{width:48, height:48, borderRadius:12, background:'#fff', border:'1px solid #E6EBE6', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
                      {c.logo ? <img src={c.logo} alt={c.nom} style={{width:'100%', height:'100%', objectFit:'contain', padding:6}} /> : <span style={{fontWeight:900, color:'#5A6A5A', fontSize:16}}>{c.nom.slice(0,1)}</span>}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontWeight:900, fontSize:13.5, color:'#0F1F2E', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', letterSpacing:.01+'em'}}>{c.nom}</div>
                      <div style={{fontSize:11, color:'#6B7A6B', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginTop:2}}>
                        <span style={{background:'#F2F4F2', padding:'2px 6px', borderRadius:6, fontSize:10, border:'1px solid #E6EBE6'}}>{c.marca||'Sin marca'}</span>
                        <span>· NIT {c.nit||'—'}</span>
                        <span>· {c.ciu||'—'}</span>
                      </div>
                      <div style={{display:'flex', gap:4, marginTop:7, flexWrap:'wrap'}}>
                        <span style={{fontSize:9, padding:'3px 7px', borderRadius:20, background: c.ejId?'linear-gradient(135deg,#E8F5EE,#D4EDDA)':'#FFF5F5', color: c.ejId?'#0F6B33':'#8B1A1A', border:'1px solid '+(c.ejId?'#C8E6D4':'#F5C6CB'), fontWeight:800, display:'inline-flex', gap:4, alignItems:'center'}}><span style={{width:6,height:6, borderRadius:'50%', background: c.ejId?'#168A43':'#C0392B'}} />{c.ejId?'Atención':'Sin ej.'}</span>
                        <span style={{fontSize:9, padding:'3px 7px', borderRadius:20, background: sel?'#FFFDF0':'#FFF5F5', color: sel?'#7A6010':'#8B1A1A', border:'1px solid '+(sel?'#FFE082':'#F5C6CB'), fontWeight:700}}>{sel? sel.nom.split(' ')[0]:'Sin Sel.'}</span>
                        <span style={{fontSize:9, padding:'3px 7px', borderRadius:20, background: sst?'#E3F2FD':'#FFF5F5', color: sst?'#0D47A1':'#8B1A1A', border:'1px solid '+(sst?'#BBDEFB':'#F5C6CB'), fontWeight:700}}>{sst? sst.nom.split(' ')[0]:'Sin SST'}</span>
                      </div>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                      <div style={{width:28, height:28, borderRadius:'50%', background: completo?'#E8F5EE': score>=2?'#FFF8E1':'#FFF5F5', border:`1px solid ${completo?'#C8E6D4': score>=2?'#FFE082':'#F5C6CB'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11}}>{completo?'✓': score>=2?'◐':'○'}</div>
                      <span style={{fontSize:9, fontWeight:800, color: completo?'#0F6B33': score>=2?'#7A6010':'#8B1A1A'}}>{score}/4</span>
                    </div>
                  </div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:0, marginTop:12, background:'linear-gradient(180deg,#FBFDFB,#F8FAF8)', border:'1px solid #F0F0F0', borderRadius:12, padding:8, position:'relative', overflow:'hidden'}}>
                    <div style={{position:'absolute', inset:0, background:'radial-gradient(300px 80px at 50% 0%, rgba(22,138,67,.04), transparent)', pointerEvents:'none'}} />
                    {[
                      {k:'Atención', v: ej? ej.nom.split(' ')[0]:'—', col: ej?'#0F6B33':'#C0392B', bg: ej?'#E8F5EE':'#FFF5F5'},
                      {k:'Selección', v: sel? sel.nom.split(' ')[0]:'—', col: sel?'#7A6010':'#C0392B', bg: sel?'#FFFDF0':'#FFF5F5'},
                      {k:'SST', v: sst? sst.nom.split(' ')[0]:'—', col: sst?'#0D47A1':'#C0392B', bg: sst?'#E3F2FD':'#FFF5F5'},
                    ].map(col=> (
                      <div key={col.k} style={{textAlign:'center', position:'relative', padding:'4px 0', borderRight: col.k!=='SST'?'1px solid #F0F0F0':''}}>
                        <div style={{fontSize:8, color:'#8A9A8A', fontWeight:800, textTransform:'uppercase', letterSpacing:.06+'em'}}>{col.k}</div>
                        <div style={{fontSize:11, fontWeight:800, color:col.col, marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{col.v}</div>
                        <div style={{width:24, height:3, borderRadius:10, background: col.bg, border:`1px solid ${col.col}20`, margin:'6px auto 0'}} />
                      </div>
                    ))}
                  </div>

                  <div style={{display:'flex', gap:8, marginTop:12}}>
                    <button onClick={() => openEdit(c)} style={{flex:1, background:'#fff', border:'1px solid #E6EBE6', borderRadius:10, padding:'9px 10px', fontSize:12, fontWeight:800, color:'#0F1F2E', display:'flex', alignItems:'center', justifyContent:'center', gap:6, cursor:'pointer', transition:'all .15s'}} onMouseEnter={e=> e.currentTarget.style.background='#F8FAF8'} onMouseLeave={e=> e.currentTarget.style.background='#fff'}>
                      <span style={{width:18, height:18, borderRadius:'50%', background:'#FFF8E1', border:'1px solid #FFE082', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10}}>✎</span> Editar trío
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={{width:36, height:36, borderRadius:10, background:'#FFF5F5', border:'1px solid #F5C6CB', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#C0392B'}}>🗑️</button>
                  </div>
                </div>
                {/* Bottom glow */}
                <div style={{height:3, background: completo?'linear-gradient(90deg,#168A43,#2ECC71)':'linear-gradient(90deg,transparent, rgba(232,187,38,.18), transparent)', opacity:.9}} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr><th>Cliente</th><th>NIT</th><th>Atención</th><th>Selección</th><th>SST</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {filtered.slice(0,60).map(c => {
                const ej = ejs.find(e => e.id === c.ejId);
                const sel = ejs.find(e => e.id === c.asignaciones?.['a1']);
                const sst = ejs.find(e => e.id === c.asignaciones?.['a2']);
                const completo = !!(ej && sel && sst && c.logo);
                return (
                  <tr key={c.id} style={{background: completo? '#F6FFF8':''}}>
                    <td style={{ fontWeight: 600, display:'flex', alignItems:'center', gap:8 }}>
                      {c.logo ? <img src={c.logo} alt="" style={{width:22, height:22, borderRadius:4, objectFit:'contain', background:'#fff', border:'1px solid #E6EBE6', padding:2}} /> : <span style={{width:22, height:22, borderRadius:4, background:'#F2F4F2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800}}>{c.nom.slice(0,1)}</span>}
                      {c.nom} <span style={{fontWeight:400, color:'var(--grt)', fontSize:11}}>{c.marca? '· '+c.marca:''}</span>
                    </td>
                    <td>{c.nit || '—'}</td>
                    <td>{ej ? <span className="b bok">{ej.nom}</span> : <span className="b bbd">—</span>}</td>
                    <td>{sel ? <span className="b" style={{background:'#FDF6D8', color:'#7A6010'}}>{sel.nom}</span> : <span style={{color:'#C0392B', fontSize:11}}>—</span>}</td>
                    <td>{sst ? <span className="b" style={{background:'#E3F2FD', color:'#0D47A1'}}>{sst.nom}</span> : <span style={{color:'#C0392B', fontSize:11}}>—</span>}</td>
                    <td>{completo? <span className="b bok">✓ Completo</span> : <span className="b bwn">Incompleto</span>}</td>
                    <td>
                      <button className="btn bgh bsm" onClick={() => openEdit(c)} style={{ marginRight: 4 }}>✏️</button>
                      <button className="btn bro bsm" onClick={() => handleDelete(c.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length>30 && vista==='cards' && <div style={{textAlign:'center', marginTop:12, fontSize:11, color:'var(--grt)', background:'#fff', padding:'8px 12px', borderRadius:20, border:'1px solid #E6EBE6', display:'inline-flex', margin:'12px auto 0', boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>Mostrando 30 de {filtered.length} — usa búsqueda o cambia a Tabla</div>}

      <div style={{marginTop:14, background:'linear-gradient(135deg,#FFFEF5 0%, #FFFDF0 100%)', border:'1px solid #FFE082', borderRadius:14, padding:12, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', boxShadow:'0 4px 12px rgba(232,187,38,.08)'}}>
        <div style={{width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#E8BB26,#F5D76E)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#12212D', flexShrink:0, boxShadow:'0 2px 8px rgba(232,187,38,.3)'}}>💡</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:900, fontSize:12, color:'#5A4A10'}}>Tip profesional</div>
          <div style={{fontSize:11, color:'#6B5A1B', marginTop:2}}>Completa el <strong>trío + logo</strong> y el informe se ve premium. Usa el filtro <strong>Sin trío</strong> para cazar incompletos en segundos.</div>
        </div>
        <span style={{background:'#12212D', color:'#E8BB26', padding:'6px 10px', borderRadius:20, fontSize:11, fontWeight:800, whiteSpace:'nowrap'}}>{filtered.filter(c=> !(c.ejId && c.asignaciones?.['a1'] && c.asignaciones?.['a2'])).length} incompletos</span>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente — trío + logo' : 'Nuevo Cliente — trío + logo'}>
        <div className="fg2" style={{ marginBottom: 12 }}>
          <div><label className="flabel">Nombre *</label><input className="finput" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Ej: AGECOLDA S.A.S." /></div>
          <div><label className="flabel">Marca</label><input className="finput" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} placeholder="Ej: AGECOLDA" /></div>
        </div>
        <div className="fg2" style={{ marginBottom: 12 }}>
          <div><label className="flabel">NIT</label><input className="finput" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="890311251" /></div>
          <div><label className="flabel">Ciudad</label><input className="finput" value={form.ciu} onChange={e => setForm({ ...form, ciu: e.target.value })} placeholder="Cali" /></div>
        </div>
        <div style={{background:'#FBFDFB', border:'1px solid #E8EAE8', borderRadius:12, padding:12, marginBottom:12}}>
          <label className="flabel">Atención al Cliente (lidera y presenta)</label>
          <select className="finput" value={form.ejId} onChange={e => setForm({ ...form, ejId: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {ejs.map(e => <option key={e.id} value={e.id}>{e.nom} — {e.email} ({e.areaId})</option>)}
          </select>
        </div>
        <div style={{background:'linear-gradient(180deg,#FFFEF0,#FFFDF0)', border:'1px solid #FFE082', borderRadius:12, padding:12, marginBottom:12}}>
          <div style={{fontSize:11, fontWeight:900, color:'#7A6010', marginBottom:8, display:'flex', alignItems:'center', gap:6}}><span style={{width:18, height:18, borderRadius:'50%', background:'#E8BB26', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10}}>◆</span> Asignación por área (quién sube cada parte)</div>
          <div className="fg2">
            <div>
              <label className="flabel">🎯 Selección</label>
              <select className="finput" value={form.selId} onChange={e => setForm({ ...form, selId: e.target.value })}>
                <option value="">— Sin asignar —</option>
                {selUsers.map(e => <option key={e.id} value={e.id}>{e.nom} — {e.email}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">🛡️ SST</label>
              <select className="finput" value={form.sstId} onChange={e => setForm({ ...form, sstId: e.target.value })}>
                <option value="">— Sin asignar —</option>
                {sstUsers.map(e => <option key={e.id} value={e.id}>{e.nom} — {e.email}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 12, background:'linear-gradient(180deg,#FBFDFB,#F8FAF8)', border:'1px solid #E8EAE8', borderRadius:12, padding:12 }}>
          <label className="flabel">Logo del cliente (en informe)</label>
          <div style={{display:'flex', gap:12, alignItems:'center', marginTop:8}}>
            <div style={{width:72, height:72, borderRadius:12, background:'#fff', border:'2px solid #E6EBE6', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              {form.logo ? <img src={form.logo} alt="logo" style={{width:'100%', height:'100%', objectFit:'contain', padding:8}} /> : <span style={{fontSize:10, color:'var(--grt)', textAlign:'center'}}>Sin<br/>logo</span>}
            </div>
            <div style={{flex:1}}>
              <label className="btn" style={{background:'linear-gradient(135deg,#12212D,#1A5276)', color:'#fff', padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', display:'inline-flex', gap:6, alignItems:'center'}}>
                📁 Subir logo
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml" style={{display:'none'}} onChange={handleLogo} />
              </label>
              {form.logo && <button className="btn bro bsm" style={{marginLeft:8}} onClick={()=> setForm(f=> ({...f, logo:''}))}>Quitar</button>}
              <div style={{fontSize:10, color:'var(--grt)', marginTop:6}}>PNG transparente 400×200px, máx 800KB. Se ve pro en la cabecera.</div>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="flabel">Ruta Drive (opcional)</label>
          <input className="finput" value={form.driveFolder} onChange={e => setForm({ ...form, driveFolder: e.target.value })} placeholder="Proservis/Informes/2026/Enero" />
        </div>
        <div className="brow" style={{ marginTop: 0 }}>
          <button className="btn bvd" onClick={handleSave} style={{background:'linear-gradient(135deg,#168A43,#1DB954)', border:'none', boxShadow:'0 4px 12px rgba(22,138,67,.25)'}}>Guardar trío</button>
          <button className="btn bgh" onClick={() => setModal(false)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
