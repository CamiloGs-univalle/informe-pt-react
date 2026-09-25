export default function StepFacturacion({ facturacion, setFacturacion }) {
  const f = facturacion || {};
  const upd = (k, v) => setFacturacion({ ...f, [k]: v });
  return (
    <div className="card">
      <div className="ct">🧾 Facturación & Indicadores Financieros</div>
      <div className="fg3">
        <div><label className="flabel">Valor facturado (COP)</label><input className="finput" type="number" value={f.valor ?? 0} onChange={e => upd('valor', +e.target.value)} /></div>
        <div><label className="flabel">Costo nómina (COP)</label><input className="finput" type="number" value={f.costo ?? 0} onChange={e => upd('costo', +e.target.value)} /></div>
        <div><label className="flabel">Margen %</label><input className="finput" type="number" value={f.margen ?? 0} onChange={e => upd('margen', +e.target.value)} /></div>
      </div>
      <div className="fg3" style={{ marginTop: 10 }}>
        <div><label className="flabel">Días cartera</label><input className="finput" type="number" value={f.cartera ?? 0} onChange={e => upd('cartera', +e.target.value)} /></div>
        <div><label className="flabel">Estado facturación</label>
          <select className="finput" value={f.estado || 'Al día'} onChange={e => upd('estado', e.target.value)}>
            <option>Al día</option><option>Pendiente</option><option>En mora</option><option>Ajuste solicitado</option>
          </select>
        </div>
        <div><label className="flabel">% cumplimiento</label><input className="finput" type="number" value={f.cumplimiento ?? 100} onChange={e => upd('cumplimiento', +e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 10 }}><label className="flabel">Observaciones financieras</label><textarea className="finput" value={f.obs || ''} onChange={e => upd('obs', e.target.value)} placeholder="Novedades de facturación, ajustes..." /></div>
    </div>
  );
}
