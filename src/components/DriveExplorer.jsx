import { useState, useRef } from "react";
import { toast } from "../store";

export default function DriveExplorer({ onFilesSelected }) {
  const [connected, setConnected] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const folderRef = useRef(null);

  const handleConnect = () => {
    folderRef.current.click();
  };

  const handleFolderSelect = async (e) => {
    const fileList = Array.from(e.target.files);
    if (!fileList.length) return;

    setLoading(true);
    const folderPath = fileList[0].webkitRelativePath.split('/')[0];
    setFolderName(folderPath);

    const excelFiles = fileList.filter(f =>
      f.name.match(/\.(xlsx|xls|csv)$/i) && !f.name.startsWith('~$')
    );

    if (!excelFiles.length) {
      toast('No se encontraron archivos Excel en esta carpeta');
      setLoading(false);
      return;
    }

    setFiles(excelFiles.map(f => ({
      name: f.name,
      size: f.size,
      path: f.webkitRelativePath,
      file: f,
      selected: false
    })));
    setConnected(true);
    setLoading(false);
    toast(`${excelFiles.length} archivos Excel encontrados en "${folderPath}"`);
  };

  const toggleSelect = (idx) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, selected: !f.selected } : f));
    setSelected(prev => {
      const file = files[idx];
      if (file.selected) return prev.filter(f => f !== file);
      return [...prev, file];
    });
  };

  const selectAll = () => {
    const allSelected = files.every(f => f.selected);
    setFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })));
    setSelected(allSelected ? [] : [...files]);
  };

  const handleUseFiles = () => {
    const toUse = files.filter(f => f.selected);
    if (!toUse.length) { toast('Selecciona al menos un archivo'); return; }
    onFilesSelected(toUse.map(f => f.file));
    toast(`${toUse.length} archivo(s) enviado(s) al parser`);
  };

  const handleDisconnect = () => {
    setConnected(false);
    setFolderName('');
    setFiles([]);
    setSelected([]);
  };

  if (!connected) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📂</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
            Conecta tu carpeta de informes
          </div>
          <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
            Selecciona la carpeta de tu PC donde tienes los archivos Excel con la información de tus clientes. El sistema leerá todos los Excel automáticamente.
          </div>
          <button className="btn bvd" onClick={handleConnect} style={{ padding: '14px 28px', fontSize: 14 }}>
            📁 Seleccionar carpeta
          </button>
          <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={handleFolderSelect} />
          {loading && <div style={{ fontSize: 12, color: 'var(--grt)', marginTop: 10 }}>⏳ Leyendo archivos...</div>}
        </div>

        <div className="card">
          <div className="ct">💡 ¿Cómo funciona?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.8 }}>
            <strong>1.</strong> Haz clic en "Seleccionar carpeta" y elige la carpeta donde tienes tus Excel.<br/>
            <strong>2.</strong> El sistema muestra todos los archivos Excel encontrados.<br/>
            <strong>3.</strong> Seleccionas cuáles usar y el sistema extrae los datos automáticamente.<br/>
            <strong>4.</strong> Revisas, ajustas y generas el informe final.
          </div>
        </div>

        <div className="card">
          <div className="ct">📋 ¿Qué archivos necesito?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.8 }}>
            Tus Excel deben tener hojas con nombres como:<br/>
            • <strong>Headcount</strong> o "Personal" → Movimiento de personal<br/>
            • <strong>Selección</strong> o "RQ" → Requerimientos y contrataciones<br/>
            • <strong>Rotación</strong> o "Retiros" → Motivos de salida<br/>
            • <strong>SST</strong> o "Seguridad" → Accidentes e inducciones<br/>
            • <strong>Nómina</strong> o "Liquidaciones" → Datos de nómina
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--vdo)' }}>📁 {folderName}</div>
            <div style={{ fontSize: 12, color: 'var(--grt)' }}>{files.length} archivos Excel encontrados · {selected.length} seleccionados</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn bgh bsm" onClick={() => folderRef.current.click()}>Cambiar carpeta</button>
            <button className="btn bro bsm" onClick={handleDisconnect}>✕ Desconectar</button>
          </div>
        </div>
        <input ref={folderRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={handleFolderSelect} />
      </div>

      <div className="card">
        <div className="ct" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Archivos Excel</span>
          <button className="btn bgh bsm" onClick={selectAll}>{files.every(f => f.selected) ? 'Desmarcar todos' : 'Seleccionar todos'}</button>
        </div>
        {files.map((f, i) => (
          <div key={i} className="clcard" onClick={() => toggleSelect(i)}
            style={{ cursor: 'pointer', borderColor: f.selected ? 'var(--vd)' : 'transparent',
              background: f.selected ? 'var(--vc)' : '#fff', transition: 'all .15s' }}>
            <div className="clav" style={{ background: f.selected ? 'var(--vd)' : 'var(--vc)',
              color: f.selected ? '#fff' : 'var(--vd)', transition: 'all .15s' }}>
              {f.selected ? '✓' : '📊'}
            </div>
            <div style={{ flex: 1 }}>
              <div className="clnm">{f.name}</div>
              <div className="clmt">{(f.size / 1024).toFixed(1)} KB · {f.path}</div>
            </div>
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
          <div className="ct">✅ {selected.length} archivo(s) listo(s)</div>
          <div className="brow" style={{ marginTop: 0 }}>
            <button className="btn bvd" onClick={handleUseFiles}>📥 Extraer datos de estos archivos</button>
          </div>
        </div>
      )}
    </div>
  );
}