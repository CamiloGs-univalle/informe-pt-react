import { useState, useEffect } from "react";
import { toast } from "../store";
import { initGapi, initGis, requestDriveAccess, listDriveFolders, listDriveFiles, downloadDriveFile, isDriveConnected, setDriveToken, getDriveToken, clearDriveToken, EXCEL_MIMES } from "../driveAuth";

export default function DriveExplorer({ onFilesSelected }) {
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [path, setPath] = useState([{ id: 'root', name: 'Mi Drive' }]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('folders');

  useEffect(() => {
    const t = getDriveToken();
    if (t) { setToken(t); setConnected(true); loadFolders(t); }
  }, []);

  const handleConnect = async () => {
    if (!document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
      await initGapi();
    }
    if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      initGis((accessToken) => {
        setToken(accessToken);
        setConnected(true);
        setDriveToken(accessToken);
        toast('Conectado a Google Drive');
        loadFolders(accessToken);
      });
    }
    requestDriveAccess();
  };

  const handleDisconnect = () => {
    clearDriveToken();
    setToken(null);
    setConnected(false);
    setFolders([]);
    setFiles([]);
    setSelected([]);
    toast('Desconectado de Google Drive');
  };

  const loadFolders = async (tkn, parentId = 'root') => {
    setLoading(true);
    try {
      const data = await listDriveFolders(tkn, parentId);
      setFolders(data);
    } catch(e) { toast('Error al cargar carpetas'); }
    setLoading(false);
  };

  const loadFiles = async (tkn, folderId) => {
    setLoading(true);
    try {
      const data = await listDriveFiles(tkn, folderId, EXCEL_MIMES);
      setFiles(data);
    } catch(e) { toast('Error al cargar archivos'); }
    setLoading(false);
  };

  const navigateTo = async (folder) => {
    setCurrentFolder(folder);
    setPath([...path, { id: folder.id, name: folder.name }]);
    await loadFolders(token, folder.id);
    await loadFiles(token, folder.id);
    setTab('files');
  };

  const navigateToPath = async (idx) => {
    const target = path[idx];
    setPath(path.slice(0, idx + 1));
    setCurrentFolder(idx === 0 ? null : target);
    await loadFolders(token, target.id);
    await loadFiles(token, target.id);
  };

  const toggleSelect = (file) => {
    setSelected(prev =>
      prev.find(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );
  };

  const handleUseFiles = async () => {
    if (!selected.length) { toast('Selecciona al menos un archivo'); return; }
    setLoading(true);
    const downloaded = [];
    for (const file of selected) {
      try {
        const buf = await downloadDriveFile(token, file.id);
        const blob = new Blob([buf], {
          type: file.mimeType === 'text/csv' ? 'text/csv' :
                 file.mimeType.includes('openxmlformats') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                 'application/vnd.ms-excel'
        });
        const ext = file.name.split('.').pop();
        downloaded.push(new File([blob], file.name, { type: blob.type }));
      } catch(e) { toast('Error al descargar ' + file.name); }
    }
    setLoading(false);
    if (onFilesSelected) onFilesSelected(downloaded);
    toast(`${downloaded.length} archivo(s) descargado(s)`);
  };

  if (!connected) {
    return (
      <div>
        <div className="ph">Google Drive</div>
        <div className="ps">Conecta tu cuenta para acceder a los archivos Excel directamente</div>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>Conecta tu Google Drive</div>
          <div style={{ fontSize: 13, color: 'var(--grt)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Al conectar, podrás navegar tus carpetas y seleccionar los archivos Excel con la información de tus clientes para generar informes automáticamente.
          </div>
          <button className="btn bvd" onClick={handleConnect} style={{ padding: '14px 28px', fontSize: 15 }}>
            🔗 Conectar con Google Drive
          </button>
          <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 12 }}>
            Se abrirá una ventana de Google para autorizar el acceso
          </div>
        </div>
        <div className="card">
          <div className="ct">¿Cómo funciona?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.8 }}>
            <strong>1.</strong> Haz clic en "Conectar con Google Drive" y autoriza el acceso.<br/>
            <strong>2.</strong> Navega por tus carpetas y selecciona los archivos Excel.<br/>
            <strong>3.</strong> Los datos se extraen automáticamente y se llenan el formulario.<br/>
            <strong>4.</strong> Revisa, ajusta y genera el informe final.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Google Drive</div>
        <button className="btn bro bsm" onClick={handleDisconnect}>Desconectar</button>
      </div>
      <div className="ps">Navega y selecciona los archivos Excel para el informe</div>

      {/* Path breadcrumb */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        {path.map((p, i) => (
          <span key={p.id}>
            {i > 0 && <span style={{ color: 'var(--grt)', margin: '0 4px' }}>/</span>}
            <button className="btn bgh bsm" onClick={() => navigateToPath(i)} style={{ padding: '4px 10px' }}>
              {i === 0 ? '📁' : ''} {p.name}
            </button>
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="modo-tabs" style={{ marginBottom: 14 }}>
        <div className={"modo-tab" + (tab === 'folders' ? ' on' : '')} onClick={() => setTab('folders')}>
          <span className="mt-ico">📂</span>
          <div className="mt-tit">Carpetas</div>
          <div className="mt-sub">{folders.length} carpetas</div>
        </div>
        <div className={"modo-tab" + (tab === 'files' ? ' on' : '')} onClick={() => setTab('files')}>
          <span className="mt-ico">📊</span>
          <div className="mt-tit">Archivos Excel</div>
          <div className="mt-sub">{files.length} archivos · {selected.length} seleccionados</div>
        </div>
      </div>

      {loading && <div className="alrt aam">⏳ Cargando...</div>}

      {/* Folders tab */}
      {tab === 'folders' && (
        <div className="card">
          <div className="ct">📂 Carpetas</div>
          {folders.length === 0 && !loading && <div style={{ fontSize: 12, color: 'var(--grt)' }}>No hay carpetas en esta ubicación</div>}
          {folders.map(f => (
            <div key={f.id} className="clcard" onClick={() => navigateTo(f)} style={{ cursor: 'pointer' }}>
              <div className="clav" style={{ background: 'var(--amc)', color: 'var(--osc)' }}>📁</div>
              <div>
                <div className="clnm">{f.name}</div>
                <div className="clmt">{new Date(f.modifiedTime).toLocaleDateString('es-CO')}</div>
              </div>
              <div className="clri"><span style={{ fontSize: 11, color: 'var(--grt)' }}>→ Abrir</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Files tab */}
      {tab === 'files' && (
        <div>
          <div className="card">
            <div className="ct">📊 Archivos Excel disponibles</div>
            {files.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: 'var(--grt)', textAlign: 'center', padding: 20 }}>
                No hay archivos Excel en esta carpeta. Sube archivos Excel (.xlsx) aquí o en otra carpeta.
              </div>
            )}
            {files.map(f => (
              <div key={f.id} className="clcard" onClick={() => toggleSelect(f)}
                style={{ cursor: 'pointer', borderColor: selected.find(s => s.id === f.id) ? 'var(--vd)' : 'transparent',
                  background: selected.find(s => s.id === f.id) ? 'var(--vc)' : '#fff' }}>
                <div className="clav" style={{ background: selected.find(s => s.id === f.id) ? 'var(--vd)' : 'var(--vc)',
                  color: selected.find(s => s.id === f.id) ? '#fff' : 'var(--vd)' }}>
                  {selected.find(s => s.id === f.id) ? '✓' : '📊'}
                </div>
                <div>
                  <div className="clnm">{f.name}</div>
                  <div className="clmt">{f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'} · {new Date(f.modifiedTime).toLocaleDateString('es-CO')}</div>
                </div>
              </div>
            ))}
          </div>

          {selected.length > 0 && (
            <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
              <div className="ct">{selected.length} archivo(s) seleccionado(s)</div>
              <div className="brow" style={{ marginTop: 0 }}>
                <button className="btn bvd" onClick={handleUseFiles}>📥 Usar estos archivos para el informe</button>
                <button className="btn bgh" onClick={() => setSelected([])}>Limpiar selección</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}