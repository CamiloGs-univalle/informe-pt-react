export default function StepAusentismo({ ausentismo, setAusentismo }) {
  const a = ausentismo || {};
  const upd = (k, v) => setAusentismo({ ...a, [k]: v });
  return (
    <div className="card">
      <div className="ct">⏰ Ausentismo</div>
      <div className="fg4">
        <div><label className="flabel">Horas ausencia</label><input className="finput" type="number" value={a.horas ?? 0} onChange={e => upd('horas', +e.target.value)} /></div>
        <div><label className="flabel">Nº eventos</label><input className="finput" type="number" value={a.eventos ?? 0} onChange={e => upd('eventos', +e.target.value)} /></div>
        <div><label className="flabel">Tasa ausentismo %</label><input className="finput" type="number" value={a.tasa ?? 0} onChange={e => upd('tasa', +e.target.value)} /></div>
        <div><label className="flabel">Días perdidos</label><input className="finput" type="number" value={a.diasPerdidos ?? 0} onChange={e => upd('diasPerdidos', +e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 10 }}><label className="flabel">Principales causas</label><input className="finput" value={a.causas || ''} onChange={e => upd('causas', e.target.value)} placeholder="Ej. Incapacidad E.G., permisos..." /></div>
      <div style={{ marginTop: 10 }}><label className="flabel">Observaciones / plan de acción</label><textarea className="finput" value={a.obs || ''} onChange={e => upd('obs', e.target.value)} placeholder="Qué se hará para reducir el ausentismo" /></div>
    </div>
  );
}
