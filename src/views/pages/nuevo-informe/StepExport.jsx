/** Último paso: guardar el informe en el historial y/o descargarlo. */
import { Link } from 'react-router-dom';

export default function StepExport({ previewHtml, generating, guardado, onExportHTML, onExportPDF, onExportPPTX, onSave }) {
  return (
    <div className="card">
      <div className="ct">Guardar y descargar</div>
      {guardado && <div className="alrt avd">Informe guardado. Lo encuentras en <Link to="/guardados" className="link">Informes guardados</Link>.</div>}
      <div className="exp-grid">
        <div className="exp-box">
          <div className="exp-t">1. Guarda el informe</div>
          <p className="text-muted">Queda en “Informes guardados” para consultarlo, calificarlo o descargarlo después.</p>
          <button type="button" className="btn bvd" onClick={onSave} disabled={!previewHtml || generating}>{guardado ? 'Guardar de nuevo' : 'Guardar en informes guardados'}</button>
        </div>
        <div className="exp-box">
          <div className="exp-t">2. Descárgalo (opcional)</div>
          <p className="text-muted">PDF para enviar al cliente, PowerPoint con gráficas editables o HTML.</p>
          <div className="brow" style={{ marginTop: 0 }}>
            <button type="button" className="btn bam" onClick={onExportPDF} disabled={!previewHtml || generating}>{generating ? 'Generando…' : 'PDF'}</button>
            <button type="button" className="btn bgh" onClick={onExportPPTX} disabled={!previewHtml || generating}>PowerPoint</button>
            <button type="button" className="btn bgh" onClick={onExportHTML} disabled={!previewHtml}>HTML</button>
          </div>
        </div>
      </div>
    </div>
  );
}
