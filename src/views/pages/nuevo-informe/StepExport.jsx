/**
 * views/pages/nuevo-informe/StepExport.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Final step shared by both modes: export the generated informe as HTML or
 * PDF, or save it to the historial (`Guardados`).
 */
export default function StepExport({ previewHtml, generating, onExportHTML, onExportPDF, onExportPPTX, onSave }) {
  return (
    <div>
      <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
        <div className="ct">📥 Exportar informe</div>
        <div className="brow" style={{ marginTop: 0, flexWrap: 'wrap' }}>
          <button className="btn bvd" onClick={onExportHTML} disabled={!previewHtml}>📄 Descargar HTML</button>
          <button className="btn bam" onClick={onExportPDF} disabled={!previewHtml || generating}>📑 Descargar PDF</button>
          <button className="btn" style={{ background: '#E85D04', color: '#fff' }} onClick={onExportPPTX} disabled={!previewHtml || generating}>📊 Descargar PowerPoint (18 slides)</button>
          <button className="btn bgh" onClick={onSave} disabled={!previewHtml}>💾 Guardar en historial</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 8 }}>PowerPoint fiel a la plantilla PLANTILLA OPERACIONES — con gráficas nativas editables</div>
      </div>
      {previewHtml && (
        <div className="card">
          <div className="ct">👁 Vista previa final</div>
          <div style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
            <iframe title="Vista previa" srcDoc={previewHtml} style={{ width: '100%', height: 500, border: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
}
