/**
 * views/pages/nuevo-informe/DataReportCard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Shows what `services/excel.service.js#generateDataReport` found vs.
 * couldn't find in the uploaded Excel files. Used right after upload
 * (StepDriveUpload) and again when reviewing the extracted data
 * (StepRevisarDatos) — previously duplicated inline in both places.
 */
export default function DataReportCard({ dataReport }) {
  if (!dataReport) return null;
  const hasMissing = dataReport.missing.length > 0;
  return (
    <div className="card" style={{ background: hasMissing ? 'var(--amc)' : 'var(--vc)', border: hasMissing ? '1px solid #e8d78a' : '1px solid #C8E6D4' }}>
      <div className="ct">{hasMissing ? '⚠️ Datos parciales' : '✅ Todos los datos encontrados'}</div>
      {dataReport.available.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>Encontrados:</div>
          {dataReport.available.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--vdo)', padding: '2px 0' }}>✓ {a.section} — {a.fields.join(', ')}</div>
          ))}
        </div>
      )}
      {hasMissing && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7A6010', marginBottom: 4 }}>Faltantes (se pueden llenar después):</div>
          {dataReport.missing.map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7A6010', padding: '2px 0' }}>• {m}</div>
          ))}
        </div>
      )}
    </div>
  );
}
