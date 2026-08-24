import { useState } from "react";

const MOCK_FOLDERS = [
  {
    id: "root",
    name: "Proservis",
    children: [
      {
        id: "informes",
        name: "Informes 2026",
        children: [
          { id: "enero", name: "Enero", children: [] },
          { id: "febrero", name: "Febrero", children: [] },
          { id: "marzo", name: "Marzo", children: [] },
        ],
      },
      {
        id: "clientes",
        name: "Clientes",
        children: [
          { id: "clienteA", name: "Cliente A", children: [] },
          { id: "clienteB", name: "Cliente B", children: [] },
        ],
      },
      { id: "plantillas", name: "Plantillas", children: [] },
    ],
  },
];

function FolderItem({ folder, depth, selectedId, onSelect, expanded, onToggle }) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expanded[folder.id];

  return (
    <div>
      <div
        className={"drive-folder" + (selectedId === folder.id ? " active" : "")}
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => onSelect(folder.id, folder.name)}
        onDoubleClick={() => hasChildren && onToggle(folder.id)}
      >
        {hasChildren ? (
          <span
            className="drive-icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(folder.id);
            }}
          >
            {isExpanded ? "📂" : "📁"}
          </span>
        ) : (
          <span className="drive-icon">📁</span>
        )}
        <span>{folder.name}</span>
      </div>
      {isExpanded &&
        hasChildren &&
        folder.children.map((child) => (
          <FolderItem
            key={child.id}
            folder={child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

export default function DriveExplorer() {
  const [connected, setConnected] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [expanded, setExpanded] = useState({ root: true });

  const buildPath = (nodes, target, path) => {
    for (const n of nodes) {
      if (n.id === target) return path + n.name;
      if (n.children) {
        const result = buildPath(n.children, target, path + n.name + "/");
        if (result) return result;
      }
    }
    return null;
  };

  const handleSelect = (id, name) => {
    setSelectedId(id);
    const path = buildPath(MOCK_FOLDERS, id, "") || name;
    setSelectedPath(path);
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      <div className="ph">
        <h2>Google Drive</h2>
        <p className="ps">Explora y selecciona carpetas para tus informes</p>
      </div>

      <div className="card">
        <div className="ct">Estado de conexión</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span
            className={
              connected ? "badge badge-success" : "badge badge-muted"
            }
          >
            {connected ? "🟢 Conectado a Google Drive" : "⚪ No conectado"}
          </span>
          <button
            className={connected ? "btn bgh bsm" : "btn bvd"}
            onClick={() => setConnected((prev) => !prev)}
          >
            {connected ? "Desconectar" : "Conectar"}
          </button>
        </div>
      </div>

      {connected && (
        <>
          <div className="card">
            <div className="ct">Carpetas</div>
            <div className="drive-tree">
              {MOCK_FOLDERS.map((f) => (
                <FolderItem
                  key={f.id}
                  folder={f}
                  depth={0}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  expanded={expanded}
                  onToggle={toggleExpand}
                />
              ))}
            </div>
          </div>

          {selectedPath && (
            <div className="card">
              <div className="ct">Ruta seleccionada</div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 14,
                  padding: "8px 12px",
                  background: "var(--vc, #f0faf4)",
                  borderRadius: 6,
                  marginTop: 8,
                }}
              >
                📂 {selectedPath}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
