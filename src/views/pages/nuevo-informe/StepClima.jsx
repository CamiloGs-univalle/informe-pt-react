export default function StepClima({ clima, setClima }) {
  const c = clima || {};
  const upd = (k, v) => setClima({ ...c, [k]: v });
  return (
    <div className="card">
      <div className="ct">😊 Clima Laboral & Bienestar</div>
      <div className="fg4">
        <div><label className="flabel">Satisfacción %</label><input className="finput" type="number" value={c.satisfaccion ?? 0} onChange={e => upd('satisfaccion', +e.target.value)} /></div>
        <div><label className="flabel">eNPS</label><input className="finput" type="number" value={c.enps ?? 0} onChange={e => upd('enps', +e.target.value)} /></div>
        <div><label className="flabel">Participación %</label><input className="finput" type="number" value={c.participacion ?? 0} onChange={e => upd('participacion', +e.target.value)} /></div>
        <div><label className="flabel">Actividades bienestar</label><input className="finput" type="number" value={c.actividades ?? 0} onChange={e => upd('actividades', +e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 10 }}><label className="flabel">Encuesta / comentarios destacados</label><textarea className="finput" value={c.encuesta || ''} onChange={e => upd('encuesta', e.target.value)} placeholder="Qué dijo la gente este mes" /></div>
      <div style={{ marginTop: 10 }}><label className="flabel">Plan de mejora</label><textarea className="finput" value={c.plan || ''} onChange={e => upd('plan', e.target.value)} placeholder="Acciones para el próximo mes" /></div>
    </div>
  );
}
