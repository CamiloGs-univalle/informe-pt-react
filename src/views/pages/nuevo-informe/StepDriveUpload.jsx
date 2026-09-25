/**
 * views/pages/nuevo-informe/StepDriveUpload.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Step 1 of the "auto" mode: drag/drop or pick local Excel files, or
 * connect Google Drive (`DriveExplorer`) to pull them from there.
 */
import DriveExplorer from '../../common/DriveExplorer';
import DataReportCard from './DataReportCard';
import { downloadPlantillaSeleccion, downloadPlantillaSST, downloadPlantillaCompleta } from '../../../services/template.service';

export default function StepDriveUpload({ uploading, onDrop, onLocalUpload, onDriveFiles, dataReport }) {
  return (
    <div>
      <div className="card" style={{background:'#FBFDFB', border:'1px solid #168A43'}}>
        <div className="ct">📥 Plantillas — descarga la guía y sube sin errores</div>
        <div style={{fontSize:11, color:'var(--grt)', marginBottom:8}}>Columnas exactas con ejemplo. Solo filtra por tu área y arrastra.</div>
        <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
          <button className="btn bvd bsm" onClick={downloadPlantillaSeleccion}>⬇ Selección (ficha 4 ind.)</button>
          <button className="btn bsm" style={{background:'#1A5276', color:'#fff'}} onClick={downloadPlantillaSST}>⬇ SST + Casos</button>
          <button className="btn bgh bsm" onClick={downloadPlantillaCompleta}>⬇ Completa (todas)</button>
        </div>
      </div>

      <div className="card">
        <div className="ct">📁 Sube o conecta tus archivos Excel</div>
        <div className="alrt aam" style={{ marginBottom: 12 }}>
          <strong>¿Qué archivos necesitas?</strong><br/>
          El sistema busca automáticamente hojas de: <strong>Headcount, Selección, Rotación, SST, Nómina</strong>. Puedes subir uno o varios Excel.
        </div>
        <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={onDrop}
          onClick={() => document.getElementById('excel-main').click()}>
          {uploading ? (
            <div><span className="dz-ico">⏳</span><div className="dz-tit">Procesando...</div></div>
          ) : (
            <div>
              <span className="dz-ico">📊</span>
              <div className="dz-tit">Arrastra los Excel aquí o haz clic</div>
              <div className="dz-sub">Acepa .xlsx, .xls, .csv — Puedes subir varios archivos a la vez</div>
              <div className="dz-fmt"><span className="fmt-chip">Excel</span><span className="fmt-chip">CSV</span></div>
            </div>
          )}
        </div>
        <input id="excel-main" type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: 'none' }} onChange={onLocalUpload} />
      </div>

      <div className="card">
        <div className="ct">🔗 O conecta directo con Google Drive</div>
        <DriveExplorer onFilesSelected={onDriveFiles} />
      </div>

      <DataReportCard dataReport={dataReport} />
    </div>
  );
}
