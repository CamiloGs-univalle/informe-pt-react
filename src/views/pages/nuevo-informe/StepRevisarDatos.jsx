/**
 * views/pages/nuevo-informe/StepRevisarDatos.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Step 2 of "auto" mode: read-only summary of what was extracted from the
 * uploaded Excel files, before moving on to the editable review step.
 */
import DataReportCard from './DataReportCard';

export default function StepRevisarDatos({ dataReport, headcount, seleccion, rotacion, sst, nomina, onBack, onContinue }) {
  return (
    <div>
      <DataReportCard dataReport={dataReport} />

      {!dataReport && (
        <div className="card">
          <div className="ct">🔍 Revisar datos extraídos</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', textAlign: 'center', padding: 20 }}>
            No hay datos para revisar. Sube archivos Excel en el paso anterior.
          </div>
        </div>
      )}

      <div className="card">
        <div className="ct">📋 Datos extraídos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--vc)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>👥 Headcount</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>
              Inicio: {headcount.inicio} | Ingresos: {headcount.ingresos} | Retiros: {headcount.retiros}
            </div>
            <div style={{ fontSize: 11, color: 'var(--vd)', fontWeight: 700 }}>
              Cierre: {headcount.inicio + headcount.ingresos - headcount.retiros}
            </div>
          </div>
          <div style={{ background: 'var(--vc)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>🎯 Selección</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>{seleccion.length} RQ(s) encontrado(s)</div>
          </div>
          <div style={{ background: 'var(--vc)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>↻ Rotación</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>{rotacion.length} motivo(s) encontrado(s)</div>
          </div>
          <div style={{ background: 'var(--vc)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>🛡️ SST</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>{sst.casos?.length || 0} caso(s)</div>
          </div>
          <div style={{ background: 'var(--vc)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>💰 Nómina</div>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>Liquidados: {nomina.liquidados || 0}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <button className="btn bgh" onClick={onBack}>← Volver a archivos</button>
        <button className="btn bvd" onClick={onContinue}>Continuar a ajustar →</button>
      </div>
    </div>
  );
}
