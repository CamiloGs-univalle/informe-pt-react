/**
 * views/pages/nuevo-informe/StepNomina.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manual-mode step 5: payroll figures and observations for the period.
 */
export default function StepNomina({ nomina, setNomina }) {
  return (
    <div className="card">
      <div className="ct">💰 Nómina</div>
      <div className="fg4">
        <div><label className="flabel">Liquidados</label><input className="finput" type="number" value={nomina.liquidados || 0} onChange={e => setNomina({ ...nomina, liquidados: +e.target.value })} /></div>
        <div><label className="flabel">Incapacidades</label><input className="finput" type="number" value={nomina.incapacidades || 0} onChange={e => setNomina({ ...nomina, incapacidades: +e.target.value })} /></div>
        <div><label className="flabel">Licencias</label><input className="finput" type="number" value={nomina.licencias || 0} onChange={e => setNomina({ ...nomina, licencias: +e.target.value })} /></div>
        <div><label className="flabel">HE diurnas</label><input className="finput" type="number" value={nomina.heDiurnas || 0} onChange={e => setNomina({ ...nomina, heDiurnas: +e.target.value })} /></div>
      </div>
      <div className="fg2" style={{ marginTop: 10 }}>
        <div><label className="flabel">HE nocturnas</label><input className="finput" type="number" value={nomina.heNocturnas || 0} onChange={e => setNomina({ ...nomina, heNocturnas: +e.target.value })} /></div>
        <div><label className="flabel">Errores</label><input className="finput" type="number" value={nomina.errores || 0} onChange={e => setNomina({ ...nomina, errores: +e.target.value })} /></div>
      </div>
      <div style={{ marginTop: 10 }}><label className="flabel">Observaciones</label><textarea className="finput" value={nomina.observaciones || ''} onChange={e => setNomina({ ...nomina, observaciones: e.target.value })} /></div>
    </div>
  );
}
