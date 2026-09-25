/**
 * views/pages/nuevo-informe/StepSST.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manual-mode step 4: SST indicators, general observations, and a list of
 * medical cases (casos) being tracked.
 */
export default function StepSST({ sst, setSst, obs, setObs, addCaso, removeCaso, updateCaso }) {
  return (
    <div className="card">
      <div className="ct">🛡️ SST — Seguridad y Salud en el Trabajo</div>
      <div className="fg4">
        <div><label className="flabel">Accidentes AT</label><input className="finput" type="number" value={sst.indicadores?.at || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, at: +e.target.value } })} /></div>
        <div><label className="flabel">OC común/tránsito</label><input className="finput" type="number" value={sst.indicadores?.oc || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, oc: +e.target.value } })} /></div>
        <div><label className="flabel">Lic. maternidad</label><input className="finput" type="number" value={sst.indicadores?.maternidad || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, maternidad: +e.target.value } })} /></div>
        <div><label className="flabel">Días E.G.</label><input className="finput" type="number" value={sst.indicadores?.eg || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, eg: +e.target.value } })} /></div>
      </div>
      <div className="fg2" style={{ marginTop: 10 }}>
        <div><label className="flabel">Cobertura ARL %</label><input className="finput" type="number" value={sst.indicadores?.arl || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, arl: +e.target.value } })} /></div>
        <div><label className="flabel">Inducciones SST</label><input className="finput" type="number" value={sst.indicadores?.inducciones || 0} onChange={e => setSst({ ...sst, indicadores: { ...sst.indicadores, inducciones: +e.target.value } })} /></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <label className="flabel">Observaciones</label>
        <textarea className="finput" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observaciones generales..." />
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vd)' }}>Casos médicos</span>
          <button className="btn bvd bsm" onClick={addCaso}>+ Agregar caso</button>
        </div>
        {(sst.casos || []).map((caso, i) => (
          <div key={i} className="item-box">
            <div className="item-hd"><span>Caso #{i + 1}</span><button className="btn bro bsm" onClick={() => removeCaso(i)}>✕</button></div>
            <div className="fg3">
              <div><label className="flabel">Nombre</label><input className="finput" value={caso.nombre} onChange={e => updateCaso(i, 'nombre', e.target.value)} /></div>
              <div><label className="flabel">ID</label><input className="finput" value={caso.identificacion} onChange={e => updateCaso(i, 'identificacion', e.target.value)} /></div>
              <div><label className="flabel">CIE-10</label><input className="finput" value={caso.cie10} onChange={e => updateCaso(i, 'cie10', e.target.value)} /></div>
            </div>
            <div className="fg3" style={{ marginTop: 8 }}>
              <div><label className="flabel">Fecha</label><input className="finput" type="date" value={caso.fechaInicio} onChange={e => updateCaso(i, 'fechaInicio', e.target.value)} /></div>
              <div><label className="flabel">Origen</label><select className="finput" value={caso.origen} onChange={e => updateCaso(i, 'origen', e.target.value)}><option>AT laboral</option><option>Enfermedad general</option><option>Lic. maternidad</option><option>Otro</option></select></div>
              <div><label className="flabel">Estado</label><select className="finput" value={caso.estado} onChange={e => updateCaso(i, 'estado', e.target.value)}><option>Abierto</option><option>En tratamiento</option><option>Alta médica</option><option>Retorno laboral</option></select></div>
            </div>
            <div style={{ marginTop: 8 }}><label className="flabel">Seguimiento</label><textarea className="finput" value={caso.seguimiento} onChange={e => updateCaso(i, 'seguimiento', e.target.value)} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
