export default function StepCapacitacion({ capacitacion, setCapacitacion, addItem, removeItem, updateItem }) {
  const c = capacitacion || { horas: 0, personas: 0, temas: [], obs: '' };
  const upd = (k, v) => setCapacitacion({ ...c, [k]: v });
  return (
    <div className="card">
      <div className="ct">🎓 Capacitación</div>
      <div className="fg3">
        <div><label className="flabel">Horas formación</label><input className="finput" type="number" value={c.horas ?? 0} onChange={e => upd('horas', +e.target.value)} /></div>
        <div><label className="flabel">Personas capacitadas</label><input className="finput" type="number" value={c.personas ?? 0} onChange={e => upd('personas', +e.target.value)} /></div>
        <div><label className="flabel">Cobertura %</label><input className="finput" type="number" value={c.cobertura ?? 0} onChange={e => upd('cobertura', +e.target.value)} /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vd)' }}>Temas impartidos</span>
        <button className="btn bvd bsm" onClick={addItem}>+ Tema</button>
      </div>
      {(c.temas || []).map((t, i) => (
        <div key={i} className="item-box">
          <div className="item-hd"><span>Tema #{i + 1}</span><button className="btn bro bsm" onClick={() => removeItem(i)}>✕</button></div>
          <div className="fg3">
            <div><label className="flabel">Tema</label><input className="finput" value={t.tema || ''} onChange={e => updateItem(i, 'tema', e.target.value)} placeholder="Ej. SST, servicio al cliente" /></div>
            <div><label className="flabel">Asistentes</label><input className="finput" type="number" value={t.asistentes ?? 0} onChange={e => updateItem(i, 'asistentes', +e.target.value)} /></div>
            <div><label className="flabel">Horas</label><input className="finput" type="number" value={t.horas ?? 0} onChange={e => updateItem(i, 'horas', +e.target.value)} /></div>
          </div>
        </div>
      ))}
      {(c.temas || []).length === 0 && <div style={{ fontSize: 11, color: 'var(--grt)', background: 'var(--gr)', padding: 10, borderRadius: 8, textAlign: 'center' }}>Sin temas aún. Agrega los cursos del mes.</div>}
      <div style={{ marginTop: 10 }}><label className="flabel">Observaciones</label><textarea className="finput" value={c.obs || ''} onChange={e => upd('obs', e.target.value)} placeholder="Próximas capacitaciones, logros..." /></div>
    </div>
  );
}
