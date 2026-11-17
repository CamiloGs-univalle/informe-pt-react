/** Vista previa del informe tal como saldrá (se regenera con lo que hayas llenado). */
export default function StepPreview({ previewHtml, onGeneratePreview }) {
  return (
    <div className="card">
      <div className="ct">Vista previa del informe</div>
      <div className="brow" style={{ marginTop: 0, marginBottom: 12 }}>
        <button type="button" className="btn bgh" onClick={onGeneratePreview}>Actualizar vista previa</button>
        <span className="text-muted" style={{ alignSelf: 'center' }}>Si cambias algo en los pasos anteriores, actualízala.</span>
      </div>
      {previewHtml
        ? <iframe title="Vista previa del informe" srcDoc={previewHtml} className="preview-frame" />
        : <div className="alrt aam">Aún no hay vista previa. Pulsa “Actualizar vista previa”.</div>}
    </div>
  );
}
