/**
 * views/pages/nuevo-informe/StepSeleccion.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manual-mode step 2: one editable card per RQ (requerimiento), with a
 * running totals summary (solicitadas / contratadas / efectividad).
 */
export default function StepSeleccion({ seleccion, addRQ, removeRQ, updateRQ }) {
  const totalSolicitadas = seleccion.reduce((s, r) => s + (r.solicitadas || 0), 0);
  const totalContratadas = seleccion.reduce((s, r) => s + (r.contratadas || 0), 0);
  const efectividad = totalSolicitadas > 0 ? Math.round((totalContratadas / totalSolicitadas) * 100) : 0;
  const vacantesActivas = totalSolicitadas - totalContratadas;
  const tiempoProm = seleccion.length ? Math.round(seleccion.reduce((a,r)=>a+(Number(r.tiempoRespuesta||r.diasCobertura)||0),0) / seleccion.length) : 0;
  const oportunidad = seleccion.length ? Math.round(seleccion.reduce((a,r)=>a+(Number(r.oportunidad)||0),0) / seleccion.length) : efectividad;
  // Ficha tecnica 4 indicadores
  const ficha = [
    { label: 'Oportunidad', value: (oportunidad||efectividad) + '%', sub: 'Cobertura a tiempo', color: (oportunidad||efectividad)>=80?'#168A43':(oportunidad||efectividad)>=50?'#E8BB26':'#C0392B' },
    { label: 'Efectividad', value: efectividad + '%', sub: `${totalContratadas}/${totalSolicitadas}`, color: efectividad>=80?'#168A43':efectividad>=50?'#E8BB26':'#C0392B' },
    { label: 'Tiempo resp.', value: (tiempoProm||0) + ' días', sub: 'Promedio', color: tiempoProm<=5?'#168A43':tiempoProm<=10?'#E8BB26':'#C0392B' },
    { label: 'Vacantes activas', value: vacantesActivas, sub: 'Pendientes', color: vacantesActivas===0?'#168A43': vacantesActivas<=3?'#E8BB26':'#C0392B' },
  ];

  return (
    <div className="card">
      <div className="ct">🎯 Selección y contratación — Ficha técnica</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12}}>
        {ficha.map(f=> (
          <div key={f.label} style={{background:'#fff', border:'1px solid #E8EAE8', borderLeft:`4px solid ${f.color}`, borderRadius:8, padding:'10px', textAlign:'center'}}>
            <div style={{fontSize:9, fontWeight:800, color:'var(--grt)', textTransform:'uppercase'}}>{f.label}</div>
            <div style={{fontSize:16, fontWeight:800, color:f.color, marginTop:4}}>{f.value}</div>
            <div style={{fontSize:10, color:'var(--grt)'}}>{f.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--grt)' }}>Detalle por RQ — los 4 indicadores se calculan por vacante</span>
        <button className="btn bvd bsm" onClick={addRQ}>+ Agregar RQ</button>
      </div>
      {seleccion.map((rq, i) => (
        <div key={i} className="item-box">
          <div className="item-hd"><span>RQ #{i + 1}</span><button className="btn bro bsm" onClick={() => removeRQ(i)}>✕</button></div>
          <div className="fg3">
            <div><label className="flabel">RQ PT</label><input className="finput" value={rq.rq} onChange={e => updateRQ(i, 'rq', e.target.value)} /></div>
            <div><label className="flabel">Agencia</label><input className="finput" value={rq.agencia} onChange={e => updateRQ(i, 'agencia', e.target.value)} /></div>
            <div><label className="flabel">Ciudad</label><input className="finput" value={rq.ciudad} onChange={e => updateRQ(i, 'ciudad', e.target.value)} /></div>
          </div>
          <div className="fg4" style={{ marginTop: 8 }}>
            <div><label className="flabel">Cargo</label><input className="finput" value={rq.cargo} onChange={e => updateRQ(i, 'cargo', e.target.value)} /></div>
            <div><label className="flabel">Solicitadas</label><input className="finput" type="number" value={rq.solicitadas} onChange={e => updateRQ(i, 'solicitadas', +e.target.value)} /></div>
            <div><label className="flabel">Contratadas</label><input className="finput" type="number" value={rq.contratadas} onChange={e => updateRQ(i, 'contratadas', +e.target.value)} /></div>
            <div><label className="flabel">Vacantes activas</label><div className="finput" style={{background:'#F2F4F2', fontWeight:700, color: (rq.solicitadas - rq.contratadas)===0?'#168A43':'#C0392B'}}>{(rq.solicitadas||0)-(rq.contratadas||0)}</div></div>
          </div>
          <div className="fg4" style={{ marginTop: 8 }}>
            <div><label className="flabel">Oportunidad %</label><input className="finput" type="number" value={rq.oportunidad || ''} onChange={e => {updateRQ(i,'oportunidad',+e.target.value); updateRQ(i,'diasCobertura',+e.target.value);}} placeholder="ej 85" /></div>
            <div><label className="flabel">Tiempo respuesta (días)</label><input className="finput" type="number" value={rq.tiempoRespuesta || rq.diasCobertura || ''} onChange={e => updateRQ(i,'tiempoRespuesta',+e.target.value)} placeholder="ej 5" /></div>
            <div><label className="flabel">Efectividad</label><div className="finput" style={{background:'#E8F5EE', fontWeight:800, color: rq.solicitadas? (Math.round(rq.contratadas/rq.solicitadas*100)>=80?'#168A43':'#E8BB26'):'#5A6A5A'}}>{rq.solicitadas? Math.round(rq.contratadas/rq.solicitadas*100)+'%':'—'}</div></div>
            <div><label className="flabel">Estado</label><select className="finput" value={rq.estado || ''} onChange={e => updateRQ(i, 'estado', e.target.value)}><option value="">—</option><option>Activa</option><option>Cubierta</option><option>Cancelada</option><option>Pendiente</option></select></div>
          </div>
          <div className="fg4" style={{ marginTop: 8 }}>
            <div><label className="flabel">Estado</label><select className="finput" value={rq.estado || ''} onChange={e => updateRQ(i, 'estado', e.target.value)}><option value="">—</option><option>Activa</option><option>Cubierta</option><option>Cancelada</option><option>Pendiente</option></select></div>
            <div style={{ gridColumn: 'span 3' }}><label className="flabel">Nota</label><input className="finput" value={rq.nota} onChange={e => updateRQ(i, 'nota', e.target.value)} /></div>
          </div>
        </div>
      ))}
      {seleccion.length > 0 && (
        <div className="rqsum" style={{ display: 'block' }}>
          Solicitadas: <strong>{totalSolicitadas}</strong> ·
          Contratadas: <strong>{totalContratadas}</strong> ·
          Efectividad: <strong>{efectividad}%</strong>
        </div>
      )}
    </div>
  );
}
