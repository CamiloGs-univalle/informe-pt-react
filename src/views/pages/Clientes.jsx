/**
 * Mis Clientes — Rediseño Visual y Dinámico
 * UI/UX: Creativo, visual, con recomendaciones para decisiones y clientes contentos
 */
import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getClisForEj, getClisVisiblesParaUsuario } from '../../models/Cliente';
import { getInfsForCli, getInfsForCliPeriodo } from '../../models/Informe';
import { getContribucionesForClientePeriodo } from '../../models/Contribucion';
import { getEj } from '../../models/Ejecutivo';
import { getAreas } from '../../models/Workspace';
import { DB } from '../../models/db';
import Modal from '../common/Modal';

function MiniRing({ pct, size=44 }) {
  const r = (size-6)/2, c = 2*Math.PI*r, off = c - (pct/100)*c;
  const col = pct===100?'#168A43': pct>=60?'#E8BB26':'#C0392B';
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E6EBE6" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" style={{transform:'rotate(90deg)', transformOrigin:'center', fontSize:10, fontWeight:800, fill:col}}>{pct}%</text>
    </svg>
  );
}

export default function Clientes({ ejId, user }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todos'); // todos | pendientes | aldia | nuevos
  const [orden, setOrden] = useState('nombre'); // nombre | informes | pendiente
  const [clientes, setClientes] = useState([]);
  const [detalle, setDetalle] = useState(null);
  const ejecutivo = getEj(ejId || user?.id);
  const periodoActual = new Date().toISOString().slice(0,7);
  const areas = getAreas().filter(a=> (a.modulos||[]).length);

  useEffect(() => {
    const vis = user ? getClisVisiblesParaUsuario(user) : getClisForEj(ejId);
    setClientes(vis.length ? vis : getClisForEj(ejId));
  }, [ejId, user]);

  // Calcular recomendaciones y estado por cliente
  const enriched = useMemo(() => clientes.map(c => {
    const infs = getInfsForCli(c.id);
    const tieneEsteMes = getInfsForCliPeriodo(c.id, periodoActual).length>0;
    const contribs = getContribucionesForClientePeriodo(c.id, periodoActual);
    const pendientesAreas = areas.filter(a=>{
      const ct = contribs.find(x=>x.areaId===a.id);
      return !ct || ['pendiente','en_proceso','rechazado'].includes(ct.estado);
    });
    const pct = areas.length ? Math.round(((areas.length - pendientesAreas.length)/areas.length)*100) : (tieneEsteMes?100:0);
    const last = infs.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''))[0];
    const rating = last?.rating || 0;
    let recomendacion = null, tono="ok";
    if (!tieneEsteMes && pendientesAreas.length===areas.length) { recomendacion="🚨 Informe pendiente este mes — priorizar"; tono="bad"; }
    else if (pendientesAreas.length) { recomendacion=`⚠️ Faltan ${pendientesAreas.map(a=>a.nombre).join(', ')}`; tono="warn"; }
    else if (rating>=4) { recomendacion="⭐ Cliente feliz — mantener calidad"; tono="ok"; }
    else if (rating && rating<3) { recomendacion="💡 Baja calificación — revisar feedback"; tono="warn"; }
    else if (infs.length===0) { recomendacion="🆕 Nuevo cliente — primer informe clave"; tono="warn"; }
    else if (tieneEsteMes) { recomendacion="✅ Al día — fortalecer relación"; tono="ok"; }
    else { recomendacion="✅ Estable"; tono="ok"; }
    return { c, infs, tieneEsteMes, pendientesAreas, pct, last, rating, recomendacion, tono };
  }), [clientes, periodoActual, areas]);

  const filtered = useMemo(() => {
    let list = enriched.filter(({c}) => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || (c.marca||'').toLowerCase().includes(search.toLowerCase()) || (c.nit||'').includes(search));
    if (filtro==='pendientes') list = list.filter(x=> !x.tieneEsteMes);
    if (filtro==='aldia') list = list.filter(x=> x.tieneEsteMes);
    if (filtro==='nuevos') list = list.filter(x=> x.infs.length===0);
    if (orden==='nombre') list.sort((a,b)=> a.c.nom.localeCompare(b.c.nom));
    if (orden==='informes') list.sort((a,b)=> b.infs.length - a.infs.length);
    if (orden==='pendiente') list.sort((a,b)=> a.pendientesAreas.length - b.pendientesAreas.length || b.infs.length - a.infs.length);
    return list;
  }, [enriched, search, filtro, orden]);

  const kpis = useMemo(()=> {
    const total = enriched.length;
    const aldia = enriched.filter(x=> x.tieneEsteMes).length;
    const pend = total - aldia;
    const avgRating = (()=>{ const r=enriched.flatMap(x=> x.infs.filter(i=>i.rating)); return r.length? (r.reduce((s,i)=>s+i.rating,0)/r.length).toFixed(1):'—'; })();
    const nuevos = enriched.filter(x=> x.infs.length===0).length;
    return { total, aldia, pend, avgRating, nuevos };
  }, [enriched]);

  const handleNuevo = (c) => {
    try { localStorage.setItem('nuevo_cli_preseleccion', c.id); } catch {}
    navigate('/nuevo');
  };

  // Gráfica lateral derecha para el header
  const totalDonut = kpis.total || 1;
  const aldiaPct = Math.round(kpis.aldia/totalDonut*100);
  const pendPct = Math.round(kpis.pend/totalDonut*100);
  const nuevosPct = Math.round(kpis.nuevos/totalDonut*100);
  const sumPct = aldiaPct+pendPct+nuevosPct || 1;
  // Normalizar a 100
  const normAldia = Math.round(aldiaPct/sumPct*100);
  const normPend = Math.round(pendPct/sumPct*100);
  const normNuevos = 100 - normAldia - normPend;

  return (
    <div>
      {/* Header visual — gráfica integrada en el círculo decorativo, sin bloque extra */}
      <div style={{background:'linear-gradient(135deg,#168A43 0%, #0F6B33 45%, #12212D 100%)', borderRadius:16, padding:'18px 20px', color:'#fff', position:'relative', overflow:'hidden', marginBottom:14}}>
        <div style={{position:'absolute', top:-30, right:-30, width:180, height:180, background:'rgba(232,187,38,.18)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', border:'1px solid rgba(255,255,255,.08)'}}>
          <svg width="110" height="110" viewBox="0 0 110 110" style={{transform:'rotate(-90deg)', opacity:.95}}>
            <circle cx="55" cy="55" r="36" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
            <circle cx="55" cy="55" r="36" fill="none" stroke="#E8BB26" strokeWidth="10" strokeDasharray={`${Math.round(kpis.aldia/(kpis.total||1)*100)*2.26} 226`} strokeLinecap="round" />
            <circle cx="55" cy="55" r="36" fill="none" stroke="#fff" strokeWidth="10" strokeDasharray={`${Math.round(kpis.pend/(kpis.total||1)*100)*2.26} 226`} strokeDashoffset={-Math.round(kpis.aldia/(kpis.total||1)*100)*2.26} strokeLinecap="round" opacity=".9" />
          </svg>
          <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center'}}>
            <div style={{fontSize:16, fontWeight:900, lineHeight:1, color:'#fff'}}>{kpis.total}</div>
            <div style={{fontSize:8, fontWeight:700, opacity:.8, textTransform:'uppercase', letterSpacing:.06+'em', color:'#fff'}}>Clientes</div>
          </div>
        </div>
        <div style={{position:'absolute', bottom:-20, left:-20, width:140, height:140, background:'rgba(255,255,255,.06)', borderRadius:'50%'}} />
        <div style={{position:'relative', paddingRight:90}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', flexWrap:'wrap', gap:12}}>
            <div>
              <div style={{fontSize:18, fontWeight:900, display:'flex', alignItems:'center', gap:8}}>Mis Clientes <span style={{background:'rgba(255,255,255,.15)', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid rgba(255,255,255,.2)'}}>{kpis.total} clientes</span></div>
              <div style={{fontSize:11, opacity:.85, marginTop:4}}>{ejecutivo?.nom || user?.nom} · {ejecutivo?.zona || ''} · Click en tarjeta para historial y recomendaciones</div>
            </div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <span style={{background:kpis.pend? '#FDF6D8':'#E8F5EE', color:kpis.pend? '#7A6010':'#14501E', padding:'6px 10px', borderRadius:20, fontSize:11, fontWeight:800, border:'1px solid rgba(255,255,255,.2)'}}>{kpis.pend} pendientes</span>
              <span style={{background:'rgba(255,255,255,.12)', padding:'6px 10px', borderRadius:20, fontSize:11, fontWeight:700, border:'1px solid rgba(255,255,255,.2)'}}>★ {kpis.avgRating} calidad</span>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginTop:14}}>
            <div style={{background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px', backdropFilter:'blur(6px)'}}><div style={{fontSize:10, opacity:.75, fontWeight:700, textTransform:'uppercase'}}>Total</div><div style={{fontSize:20, fontWeight:900}}>{kpis.total}</div><div style={{fontSize:10, opacity:.7}}>Clientes asignados</div></div>
            <div style={{background: kpis.aldia? 'rgba(232,187,38,.22)':'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px'}}><div style={{fontSize:10, opacity:.75, fontWeight:700, textTransform:'uppercase'}}>Al día</div><div style={{fontSize:20, fontWeight:900}}>{kpis.aldia}</div><div style={{fontSize:10, opacity:.7}}>{kpis.total? Math.round(kpis.aldia/kpis.total*100):0}% este mes</div></div>
            <div style={{background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px'}}><div style={{fontSize:10, opacity:.75, fontWeight:700, textTransform:'uppercase'}}>Pendientes</div><div style={{fontSize:20, fontWeight:900, color:kpis.pend? '#FFD54F':'#fff'}}>{kpis.pend}</div><div style={{fontSize:10, opacity:.7}}>Requieren acción</div></div>
            <div style={{background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px'}}><div style={{fontSize:10, opacity:.75, fontWeight:700, textTransform:'uppercase'}}>Nuevos</div><div style={{fontSize:20, fontWeight:900}}>{kpis.nuevos}</div><div style={{fontSize:10, opacity:.7}}>Sin historial</div></div>
          </div>
        </div>
      </div>      {/* Filtros dinámicos */}
      <div className="card" style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', padding:'12px 16px'}}>
        <input className="finput" type="text" placeholder="🔍 Buscar por nombre, marca, ciudad o NIT..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:1, minWidth:220}} />
        <select className="finput" value={filtro} onChange={e=> setFiltro(e.target.value)} style={{maxWidth:160}}>
          <option value="todos">Todos ({kpis.total})</option>
          <option value="pendientes">⚠️ Pendientes ({kpis.pend})</option>
          <option value="aldia">✅ Al día ({kpis.aldia})</option>
          <option value="nuevos">🆕 Nuevos ({kpis.nuevos})</option>
        </select>
        <select className="finput" value={orden} onChange={e=> setOrden(e.target.value)} style={{maxWidth:160}}>
          <option value="nombre">Orden: Nombre</option>
          <option value="pendiente">Orden: Más pendientes</option>
          <option value="informes">Orden: Más informes</option>
        </select>
        <span style={{fontSize:11, color:'var(--grt)', marginLeft:'auto'}}>{filtered.length} mostrados</span>
      </div>

      {/* Grid visual */}
      {filtered.length===0 && <div className="card"><div className="alrt aam">No hay clientes con ese filtro</div></div>}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:12}}>
        {filtered.slice(0,24).map(({c, infs, tieneEsteMes, pendientesAreas, pct, last, rating, recomendacion, tono}) => (
          <div key={c.id} onClick={()=> setDetalle(c)} style={{background:'#fff', border:'1px solid #E6EBE6', borderRadius:14, padding:14, cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.04)', borderLeft: `4px solid ${tieneEsteMes? '#168A43': tono==='bad'?'#C0392B': tono==='warn'?'#E8BB26':'#DDE4DD'}`, transition:'transform .15s, box-shadow .15s'}} onMouseEnter={e=> {e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,.08)'}} onMouseLeave={e=> {e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)'}}>
            <div style={{display:'flex', gap:12, alignItems:'start'}}>
              <div style={{width:42, height:42, borderRadius:10, background:'#fff', border:`1px solid #E6EBE6`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0}}>
                {c.logo ? <img src={c.logo} alt={c.nom} style={{width:'100%', height:'100%', objectFit:'contain', padding:4}} /> : <span style={{fontWeight:900, color: tieneEsteMes? '#0F6B33':'#7A6010'}}>{c.nom.slice(0,2).toUpperCase()}</span>}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:800, fontSize:13, color:'#12212D', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.nom}</div>
                <div style={{fontSize:11, color:'var(--grt)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.marca? c.marca+' · ':''}{c.ciu||'—'} · NIT {c.nit||'—'}</div>
                <div style={{display:'flex', gap:6, marginTop:6, flexWrap:'wrap'}}>
                  <span style={{fontSize:10, background: tieneEsteMes?'#D4EDDA':'#FDF0EE', color: tieneEsteMes?'#14501E':'#8B1A1A', padding:'3px 6px', borderRadius:20, fontWeight:700, border:'1px solid #E6EBE6'}}>{tieneEsteMes? 'Al día ✓':'Pendiente'}</span>
                  <span style={{fontSize:10, background:'#F2F4F2', color:'var(--grt)', padding:'3px 6px', borderRadius:20, border:'1px solid #E6EBE6'}}>{infs.length} informes</span>
                  {rating>0 && <span style={{fontSize:10, color:'#B77900', background:'#FDF6D8', padding:'3px 6px', borderRadius:20, border:'1px solid #FFE082'}}>{'★'.repeat(rating)} {rating}.0</span>}
                </div>
              </div>
              <MiniRing pct={tieneEsteMes?100: pct} />
            </div>

            <div style={{marginTop:10, background: tono==='ok'?'#F6FFF8': tono==='warn'?'#FFFDF0':'#FFF5F5', border:`1px solid ${tono==='ok'?'#C8E6D4': tono==='warn'?'#FFE082':'#F5C6CB'}`, borderRadius:10, padding:'8px 10px', fontSize:11, lineHeight:1.4}}>
              <div style={{fontWeight:700, color: tono==='ok'?'#0F6B33': tono==='warn'?'#7A6010':'#8B1A1A', fontSize:10, textTransform:'uppercase', letterSpacing:.04+'em'}}>Recomendación</div>
              <div style={{color:'var(--tx)', marginTop:2}}>{recomendacion}</div>
              {pendientesAreas.length>0 && pendientesAreas.length < areas.length && <div style={{fontSize:10, color:'var(--grt)', marginTop:4}}>Falta: {pendientesAreas.map(a=>a.nombre).join(', ')}</div>}
            </div>

            <div style={{display:'flex', gap:6, marginTop:10, justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontSize:10, color:'var(--grt)'}}>{last? `Último: ${last.per} · ${last.ejNom||''}`:'Sin historial'} </span>
              <button className="btn bvd bsm" onClick={(e)=>{e.stopPropagation(); handleNuevo(c)}}>+ Nuevo</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length>24 && <div style={{textAlign:'center', marginTop:12}}><button className="btn bgh bsm" onClick={()=> document.querySelector('input[placeholder*=\"Buscar\"]')?.focus()}>Ver más — usa búsqueda para filtrar</button></div>}

      <Modal open={!!detalle} onClose={()=>setDetalle(null)} title={detalle ? detalle.nom : 'Detalle'}>
        {detalle && (() => {
          const infs = getInfsForCli(detalle.id).sort((a,b)=> (b.per||'').localeCompare(a.per||''));
          const contribs = getContribucionesForClientePeriodo(detalle.id, periodoActual);
          const pendientes = areas.filter(a=> {
            const ct = contribs.find(x=>x.areaId===a.id);
            return !ct || ['pendiente','en_proceso','rechazado'].includes(ct.estado);
          });
          const ultimo = infs[0];
          return (
            <div>
              <div style={{display:'flex', gap:12, alignItems:'center', marginBottom:12}}>
                <div style={{width:48, height:48, borderRadius:12, background:'#fff', border:'1px solid #E6EBE6', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
                  {detalle.logo ? <img src={detalle.logo} alt={detalle.nom} style={{width:'100%', height:'100%', objectFit:'contain', padding:6}} /> : <span style={{fontWeight:900, color:'#0F6B33'}}>{detalle.nom.slice(0,2).toUpperCase()}</span>}
                </div>
                <div>
                  <div style={{fontWeight:900, fontSize:14}}>{detalle.nom} {detalle.marca? '· '+detalle.marca:''}</div>
                  <div style={{fontSize:11, color:'var(--grt)'}}>{detalle.nit? 'NIT '+detalle.nit: 'Sin NIT'} · {detalle.ciu||'—'} · Atención al Cliente: {getEj(detalle.ejId)?.nom || '—'}</div>
                  <div style={{fontSize:11, color:'var(--grt)'}}>{infs.length} informes · {contribs.length? contribs.length+' aportes este mes':'Sin aportes este mes'}</div>
                </div>
                <span className="b bok" style={{marginLeft:'auto'}}>{infs.length} informes</span>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12}}>
                <div style={{background:'#F2F4F2', borderRadius:10, padding:10, textAlign:'center', border:'1px solid #E6EBE6'}}><div style={{fontSize:10, color:'var(--grt)', fontWeight:700, textTransform:'uppercase'}}>Total</div><div style={{fontSize:18, fontWeight:900}}>{infs.length}</div><div style={{fontSize:10, color:'var(--grt)'}}>Histórico</div></div>
                <div style={{background: pendientes.length?'#FFF8E1':'#E8F5EE', borderRadius:10, padding:10, textAlign:'center', border:'1px solid #E6EBE6'}}><div style={{fontSize:10, color:'var(--grt)', fontWeight:700, textTransform:'uppercase'}}>Pendiente</div><div style={{fontSize:18, fontWeight:900, color:pendientes.length?'#C0392B':'#168A43'}}>{pendientes.length? pendientes.length+' áreas':'Al día ✓'}</div><div style={{fontSize:10, color:'var(--grt)'}}>{periodoActual}</div></div>
                <div style={{background:'#FFFEF5', borderRadius:10, padding:10, textAlign:'center', border:'1px solid #FFE082'}}><div style={{fontSize:10, color:'var(--grt)', fontWeight:700, textTransform:'uppercase'}}>Calidad</div><div style={{fontSize:18, fontWeight:900, color:'#B77900'}}>{ultimo?.rating? ultimo.rating+' ★':'—'}</div><div style={{fontSize:10, color:'var(--grt)'}}>{ultimo?.per||'Sin dato'}</div></div>
              </div>

              <div style={{background:'#FBFDFB', border:'1px solid #E8EAE8', borderRadius:10, padding:12, marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:800, color:'var(--vd)', marginBottom:6, textTransform:'uppercase'}}>Estado por área — {periodoActual}</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {areas.map(a=>{
                    const ct = contribs.find(x=>x.areaId===a.id);
                    const est = ct?.estado || 'pendiente';
                    const col = est==='validado'?'#168A43': est==='completado'?'#E8BB26': est==='en_proceso'?'#2196F3':'#DDE4DD';
                    return <span key={a.id} style={{background:'#fff', border:`1px solid ${col}`, padding:'6px 10px', borderRadius:20, fontSize:11}}><span style={{display:'inline-block', width:8, height:8, borderRadius:'50%', background:col, marginRight:6}}></span>{a.nombre}: <strong>{est}</strong></span>;
                  })}
                </div>
                {infs[0]?.feedback && <div style={{marginTop:8, background:'#FFFEF5', border:'1px solid #FFE082', borderRadius:8, padding:'8px 10px', fontSize:11, fontStyle:'italic'}}>“{infs[0].feedback}”</div>}
              </div>

              <div style={{maxHeight:180, overflowY:'auto', border:'1px solid #E6EBE6', borderRadius:10}}>
                <table className="tbl" style={{margin:0}}>
                  <thead><tr><th>Periodo</th><th>Atención al Cliente</th><th>Módulos</th><th>★</th></tr></thead>
                  <tbody>
                    {infs.slice(0,6).map(inf=> (
                      <tr key={inf.id}><td style={{fontWeight:700}}>{inf.per}</td><td style={{fontSize:11}}>{inf.ejNom||'—'}</td><td style={{fontSize:10}}>{(inf.activeModules||[]).slice(0,3).join(', ') || '—'}</td><td>{inf.rating? '★'.repeat(inf.rating):'—'}</td></tr>
                    ))}
                    {!infs.length && <tr><td colSpan={4} style={{textAlign:'center', color:'var(--grt)', padding:12}}>Aún no hay informes — ¡crea el primero!</td></tr>}
                  </tbody>
                </table>
              </div>

              <div style={{background: ultimo?.rating && ultimo.rating<3 ? '#FFF5F5':'#F6FFF8', border:`1px solid ${ultimo?.rating && ultimo.rating<3?'#F5C6CB':'#C8E6D4'}`, borderRadius:10, padding:'10px 12px', marginTop:12, fontSize:11, lineHeight:1.4}}>
                <div style={{fontWeight:800, fontSize:10, textTransform:'uppercase', color: ultimo?.rating && ultimo.rating<3?'#8B1A1A':'#0F6B33'}}>Recomendación para decisiones</div>
                <div style={{marginTop:4}}>
                  {!infs.length ? '🆕 Nuevo cliente — prioriza el primer informe para fidelizar. Revisa bien la ficha técnica.' :
                   pendientes.length ? `⚠️ Faltan ${pendientes.map(a=>a.nombre).join(', ')} este mes — contacta a su responsable.` :
                   ultimo?.rating>=4 ? '⭐ Cliente feliz — mantén calidad, pide testimonio y ofrece upsell.' :
                   ultimo?.rating && ultimo.rating<3 ? '💡 Baja calificación — agenda reunión, revisa feedback y mejora próximo mes.' :
                   '✅ Estable — fortalece relación con visita.'}
                </div>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
                <button className="btn bgh" onClick={()=>setDetalle(null)}>Cerrar</button>
                <button className="btn bvd" onClick={()=>{ setDetalle(null); handleNuevo(detalle); }}>+ Nuevo reporte para este cliente</button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
