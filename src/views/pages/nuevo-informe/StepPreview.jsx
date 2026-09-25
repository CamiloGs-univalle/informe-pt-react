/**
 * views/pages/nuevo-informe/StepPreview.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Preview step shared by both modes: (re)generate the informe's HTML and
 * show it in an iframe before exporting.
 */
export default function StepPreview({ previewHtml, onGeneratePreview }) {
  return (
    <div className="card">
      <div className="ct">👁 Vista previa del informe</div>
      <button className="btn bvd" onClick={onGeneratePreview} style={{ marginBottom: 12 }}>🔄 Generar vista previa</button>
      {previewHtml ? (
        <div style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
          <iframe title="Vista previa" srcDoc={previewHtml} style={{ width: '100%', height: 600, border: 'none' }} />
        </div>
      ) : <div className="alrt aam">Haz clic en "Generar vista previa" para ver el informe.</div>}
    </div>
  );
}
