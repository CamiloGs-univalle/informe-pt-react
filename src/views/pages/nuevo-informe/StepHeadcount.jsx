/**
 * views/pages/nuevo-informe/StepHeadcount.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Manual-mode step 1: personnel movement for the period. "Cierre" is
 * derived, never entered directly.
 */
export default function StepHeadcount({ headcount, setHeadcount }) {
  return (
    <div className="card">
      <div className="ct">👥 Headcount — Movimiento de personal</div>
      <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>Registra el movimiento de personal del período. El cierre se calcula automáticamente.</div>
      <div className="fg4">
        <div><label className="flabel">Activos inicio</label><input className="finput" type="number" value={headcount.inicio} onChange={e => setHeadcount({ ...headcount, inicio: +e.target.value })} /></div>
        <div><label className="flabel">Ingresos</label><input className="finput" type="number" value={headcount.ingresos} onChange={e => setHeadcount({ ...headcount, ingresos: +e.target.value })} /></div>
        <div><label className="flabel">Retiros</label><input className="finput" type="number" value={headcount.retiros} onChange={e => setHeadcount({ ...headcount, retiros: +e.target.value })} /></div>
        <div><label className="flabel">Activos cierre</label><input className="finput" type="number" value={headcount.inicio + headcount.ingresos - headcount.retiros} readOnly style={{ background: 'var(--vc)', fontWeight: 700, color: 'var(--vd)' }} /></div>
      </div>
    </div>
  );
}
