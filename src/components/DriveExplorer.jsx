import { useState, useEffect, useRef } from "react";
import { toast } from "../store";
import {
  loadGoogleScripts, initGoogleAuth, requestAccessToken,
  getStoredToken, setAccessToken, clearAccessToken, isConnected,
  getDriveUserInfo, listFolders, listExcelFiles, downloadFile
} from "../gdrive";

export default function DriveExplorer({ onFilesSelected }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [excelFiles, setExcelFiles] = useState([]);
  const [selected, setSelected] = useState([]);
  const [path, setPath] = useState([{ id: 'root', name: '📁 Mi Drive' }]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [tab, setTab] = useState('browse');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setConnected(true);
      initDrive(token);
    }
  }, []);

  const initDrive = async (token) => {
    try {
      setLoading(true);
      await loadGoogleScripts();
      const about = await getDriveUserInfo(token);
      setUser(about.user || about);
      await loadFolderContent(token, 'root');
      setLoading(false);
    } catch (e) {
      console.error(e);
      if (e.message.includes('401') || e.message.includes('403')) {
        clearAccessToken();
        setConnected(false);
        toast('Sesión expirada. Conecta de nuevo.');
      } else {
        setError('Error al conectar con Drive: ' + e.message);
        setLoading(false);
      }
    }
  };

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      await loadGoogleScripts();
      await initGoogleAuth((token) => {
        setAccessToken(token);
        setConnected(true);
        initDrive(token);
        toast('Conectado a Google Drive');
      });
      requestAccessToken();
    } catch (e) {
      setError('Error al inicializar: ' + e.message);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    clearAccessToken();
    setConnected(false);
    setUser(null);
    setFolders([]);
    setExcelFiles([]);
    setSelected([]);
    setPath([{ id: 'root', name: '📁 Mi Drive' }]);
    toast('Desconectado de Google Drive');
  };

  const loadFolderContent = async (token, folderId) => {
    setLoading(true);
    try {
      const [folderList, fileList] = await Promise.all([
        listFolders(folderId, token),
        listExcelFiles(folderId, token)
      ]);
      setFolders(folderList);
      setExcelFiles(fileList);
      setCurrentFolder(folderId);
    } catch (e) {
      toast('Error al cargar carpeta');
    }
    setLoading(false);
  };

  const navigateToFolder = async (folder) => {
    setPath([...path, { id: folder.id, name: folder.name }]);
    await loadFolderContent(null, folder.id);
    setTab('browse');
  };

  const navigateToBreadcrumb = async (idx) => {
    const target = path[idx];
    setPath(path.slice(0, idx + 1));
    await loadFolderContent(null, target.id);
  };

  const toggleSelect = (file) => {
    setSelected(prev =>
      prev.find(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );
  };

  const selectAll = () => {
    if (selected.length === excelFiles.length) {
      setSelected([]);
    } else {
      setSelected([...excelFiles]);
    }
  };

  const handleDownloadAndParse = async () => {
    if (!selected.length) { toast('Selecciona al menos un archivo'); return; }
    setDownloading(true);
    try {
      const files = [];
      for (const sf of selected) {
        const buf = await downloadFile(sf.id);
        const ext = sf.name.split('.').pop().toLowerCase();
        const mime = ext === 'csv' ? 'text/csv' :
          ext === 'xls' ? 'application/vnd.ms-excel' :
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const blob = new Blob([buf], { type: mime });
        files.push(new File([blob], sf.name, { type: mime }));
      }
      onFilesSelected(files);
      toast(`${files.length} archivo(s) descargado(s) y procesado(s)`);
      setTab('done');
    } catch (e) {
      toast('Error al descargar: ' + e.message);
    }
    setDownloading(false);
  };

  // ═══ NO CONECTADO ═══
  if (!connected) {
    return (
      <div>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>☁️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginBottom: 8 }}>
            Conecta tu Google Drive
          </div>
          <div style={{ fontSize: 13, color: 'var(--grt)', marginBottom: 20, maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Al conectar, podrás navegar tus carpetas de Google Drive y seleccionar los archivos Excel con la información de tus clientes para generar informes automáticamente.
          </div>
          {error && <div className="alrt aro" style={{ marginBottom: 12, maxWidth: 440, margin: '0 auto 12px' }}>{error}</div>}
          <button className="btn bvd" onClick={handleConnect} disabled={loading}
            style={{ padding: '14px 32px', fontSize: 15, background: 'linear-gradient(135deg, #4285F4, #34A853)' }}>
            {loading ? '⏳ Conectando...' : '🔗 Conectar con Google Drive'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 14 }}>
            Se abrirá una ventana de Google para autorizar el acceso
          </div>
        </div>

        <div className="card">
          <div className="ct">💡 ¿Cómo funciona?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 2 }}>
            <strong>1.</strong> Haz clic en "Conectar con Google Drive" y autoriza el acceso.<br/>
            <strong>2.</strong> Navega por tus carpetas como si fueran de tu PC.<br/>
            <strong>3.</strong> Selecciona los archivos Excel que contienen la información.<br/>
            <strong>4.</strong> El sistema extrae los datos automáticamente.<br/>
            <strong>5.</strong> Revisa, ajusta y genera el informe final.
          </div>
        </div>

        <div className="card">
          <div className="ct">📋 ¿Qué archivos puede leer?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 2 }}>
            El sistema reconoce automáticamente hojas de Excel con nombres como:<br/>
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

  // ═══ CONECTADO ═══
  return (
    <div>
      {/* User info bar */}
      <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user?.photoLink && <img src={user.photoLink} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--vdo)' }}>✅ Conectado a Google Drive</div>
              <div style={{ fontSize: 11, color: 'var(--grt)' }}>{user?.displayName} · {user?.emailAddress}</div>
            </div>
          </div>
          <button className="btn bro bsm" onClick={handleDisconnect}>Desconectar</button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {path.map((p, i) => (
          <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {i > 0 && <span style={{ color: 'var(--grt)', fontSize: 11 }}>/</span>}
            <button className="btn bgh bsm" onClick={() => navigateToBreadcrumb(i)}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: i === path.length - 1 ? 700 : 400 }}>
              {p.name}
            </button>
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="modo-tabs" style={{ marginBottom: 14 }}>
        <div className={"modo-tab" + (tab === 'browse' ? ' on' : '')} onClick={() => setTab('browse')}>
          <span className="mt-ico">📂</span>
          <div className="mt-tit">Carpetas</div>
          <div className="mt-sub">{folders.length} carpetas</div>
        </div>
        <div className={"modo-tab" + (tab === 'files' ? ' on' : '')} onClick={() => setTab('files')}>
          <span className="mt-ico">📊</span>
          <div className="mt-tit">Archivos Excel</div>
          <div className="mt-sub">{excelFiles.length} archivos · {selected.length} seleccionados</div>
        </div>
      </div>

      {loading && <div className="alrt aam">⏳ Cargando contenido de Drive...</div>}

      {/* ═══ BROWSE TAB ═══ */}
      {tab === 'browse' && (
        <div className="card">
          <div className="ct">📂 Carpetas</div>
          {folders.length === 0 && !loading && (
            <div style={{ fontSize: 12, color: 'var(--grt)', textAlign: 'center', padding: 20 }}>
              No hay carpetas en esta ubicación. Ve a la pestaña "Archivos Excel" para ver los archivos.
            </div>
          )}
          {folders.map(f => (
            <div key={f.id} className="clcard" onClick={() => navigateToFolder(f)}
              style={{ cursor: 'pointer', transition: 'all .15s' }}>
              <div className="clav" style={{ background: 'var(--amc)', color: 'var(--osc)', fontSize: 18 }}>📁</div>
              <div style={{ flex: 1 }}>
                <div className="clnm">{f.name}</div>
                <div className="clmt">{f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('es-CO') : ''}</div>
              </div>
              <div className="clri"><span style={{ fontSize: 11, color: 'var(--vd)', fontWeight: 600 }}>→ Abrir</span></div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ FILES TAB ═══ */}
      {tab === 'files' && (
        <div>
          <div className="card">
            <div className="ct" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📊 Archivos Excel en esta carpeta</span>
              {excelFiles.length > 0 && (
                <button className="btn bgh bsm" onClick={selectAll}>
                  {selected.length === excelFiles.length ? 'Desmarcar todo' : 'Seleccionar todo'}
                </button>
              )}
            </div>
            {excelFiles.length === 0 && !loading && (
              <div style={{ fontSize: 12, color: 'var(--grt)', textAlign: 'center', padding: 20 }}>
                No hay archivos Excel en esta carpeta. Navega a otra carpeta o sube archivos a tu Drive.
              </div>
            )}
            {excelFiles.map(f => (
              <div key={f.id} className="clcard" onClick={() => toggleSelect(f)}
                style={{ cursor: 'pointer', borderColor: selected.find(s => s.id === f.id) ? 'var(--vd)' : 'transparent',
                  background: selected.find(s => s.id === f.id) ? 'var(--vc)' : '#fff', transition: 'all .15s' }}>
                <div className="clav" style={{
                  background: selected.find(s => s.id === f.id) ? 'var(--vd)' : 'var(--vc)',
                  color: selected.find(s => s.id === f.id) ? '#fff' : 'var(--vd)',
                  transition: 'all .15s'
                }}>
                  {selected.find(s => s.id === f.id) ? '✓' : '📊'}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="clnm">{f.name}</div>
                  <div className="clmt">{f.size ? (f.size / 1024).toFixed(1) + ' KB' : '—'} · {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('es-CO') : ''}</div>
                </div>
              </div>
            ))}
          </div>

          {selected.length > 0 && (
            <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
              <div className="ct">📥 {selected.length} archivo(s) seleccionado(s)</div>
              <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 10 }}>
                {selected.map(f => f.name).join(', ')}
              </div>
              <div className="brow" style={{ marginTop: 0 }}>
                <button className="btn bvd" onClick={handleDownloadAndParse} disabled={downloading}>
                  {downloading ? '⏳ Descargando...' : '📥 Descargar y extraer datos'}
                </button>
                <button className="btn bgh" onClick={() => setSelected([])}>Limpiar selección</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {tab === 'done' && (
        <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
          <div className="ct">✅ Archivos procesados</div>
          <div style={{ fontSize: 12, color: 'var(--vdo)', marginBottom: 10 }}>
            Los datos se han extraído y cargado en el formulario. Puedes continuar al siguiente paso.
          </div>
        </div>
      )}
    </div>
  );
}