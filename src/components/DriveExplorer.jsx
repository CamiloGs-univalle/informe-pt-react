import { useState } from "react";
import { useToast } from "./Toast";

const MOCK_FOLDERS = [
  { id: 'root', name: 'Informes_Clientes', children: [
    { id: 'f1', name: 'Incubadora Santander', children: [
      { id: 'f1a', name: '2026', children: [
        { id: 'f1a1', name: 'Fotos', children: [] },
        { id: 'f1a2', name: 'Documentos', children: [] }
      ]}
    ]},
    { id: 'f2', name: 'Cruz Roja Colombiana', children: [
      { id: 'f2a', name: '2026', children: [] }
    ]},
    { id: 'f3', name: 'Industrias del Sur', children: [] },
    { id: 'f4', name: 'Mi Super Mercado', children: [] },
    { id: 'f5', name: 'Empresa Modelo ABC', children: [] }
  ]}
];

function FolderItem({ folder, depth, selectedId, onSelect, expanded, onToggle }) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expanded[folder.id];
  return (
    <div>
      <div
        className={"drive-folder" + (selectedId === folder.id ? " active" : "")}
        style={{ paddingLeft: depth * 20 + 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 4, fontSize: 13 }}
        onClick={() => onSelect(folder.id, folder.name)}
      >
        {hasChildren && (
          <span onClick={(e) => { e.stopPropagation(); onToggle(folder.id); }} style={{ cursor: 'pointer', width: 16, textAlign: 'center' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 16 }} />}
        <span style={{ fontSize: 16 }}>📁</span>
        <span>{folder.name}</span>
      </div>
      {isExpanded && hasChildren && folder.children.map(child => (
        <FolderItem key={child.id} folder={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}

export default function DriveExplorer({ onPathSelect }) {
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [expanded, setExpanded] = useState({ root: true });
  const [busq, setBusq] = useState("");

  const handleConnect = () => {
    setConnected(true);
    toast("✅ Conectado a Google Drive");
  };

  const handleSelect = (id, name) => {
    setSelectedId(id);
    const findPath = (nodes, target, path) => {
      for (const n of nodes) {
        if (n.id === target) return path + '/' + n.name;
        if (n.children) {
          const r = findPath(n.children, target, path + '/' + n.name);
          if (r) return r;
        }
      }
      return null;
    };
    const p = findPath(MOCK_FOLDERS, id, '') || '/' + name;
    setSelectedPath(p);
    if (onPathSelect) onPathSelect(p);
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="ph">Google Drive — Explorador de carpetas</div>
      <div className="ps">Selecciona la ruta donde se encuentran los archivos del cliente</div>

      <div className="card" style={{background:'var(--vc)',border:'1px solid #C8E6D4'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--vdo)'}}>Estado de conexión</div>
            <div style={{fontSize:12,color:'var(--grt)',marginTop:2}}>
              {connected ? '✅ Conectado a Google Drive' : '⚪ No conectado'}
            </div>
          </div>
          {!connected ? (
            <button className="btn bvd" onClick={handleConnect}>🔌 Conectar con Drive</button>
          ) : (
            <button className="btn bgh bsm" onClick={() => setConnected(false)}>Desconectar</button>
          )}
        </div>
      </div>

      {connected && (
        <>
          <div className="card">
            <div className="ct">Carpetas disponibles</div>
            <input className="finput" placeholder="Buscar carpeta..." value={busq} onChange={e => setBusq(e.target.value)} style={{marginBottom:12,maxWidth:300}} />
            <div style={{maxHeight:400,overflowY:'auto',border:'1px solid var(--grb)',borderRadius:8,padding:8}}>
              {MOCK_FOLDERS.map(f => (
                <FolderItem key={f.id} folder={f} depth={0} selectedId={selectedId} onSelect={handleSelect} expanded={expanded} onToggle={toggleExpand} />
              ))}
            </div>
          </div>

          {selectedPath && (
            <div className="card" style={{background:'var(--vc)',border:'1px solid #C8E6D4'}}>
              <div className="ct" style={{borderBottomColor:'#B8DEC8'}}>Ruta seleccionada</div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--vdo)',fontFamily:'monospace',padding:'8px 12px',background:'#fff',borderRadius:6,border:'1px solid #C8E6D4'}}>
                📂 {selectedPath}
              </div>
              <p style={{fontSize:11,color:'var(--grt)',marginTop:8}}>Los archivos de este cliente se buscarán en esta ruta de Google Drive.</p>
            </div>
          )}
        </>
      )}

      {!connected && (
        <div className="card">
          <div className="ct">¿Cómo funciona?</div>
          <div style={{fontSize:12,color:'var(--grt)',lineHeight:1.8}}>
            <strong>1.</strong> Haz clic en "Conectar con Drive" para vincular tu cuenta de Google.<br/>
            <strong>2.</strong> Navega por las carpetas y selecciona la ruta del cliente.<br/>
            <strong>3.</strong> Las fotos y documentos se cargarán desde esa ubicación.<br/>
            <strong>4.</strong> Puedes configurar una ruta por cliente en "Gestionar clientes".
          </div>
        </div>
      )}
    </div>
  );
}
