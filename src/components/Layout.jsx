import { Link, useLocation, Outlet } from "react-router-dom";
import { getEj, getEjs } from "../store";

const menuItems = [
  { section: "Principal" },
  { path: "/", label: "Dashboard", icon: "⊞" },
  { path: "/clientes", label: "Mis clientes", icon: "◉" },
  { path: "/nuevo", label: "Nuevo informe", icon: "✚" },
  { section: "Historial" },
  { path: "/guardados", label: "Informes guardados", icon: "☰" },
  { section: "Administración" },
  { path: "/aclientes", label: "Gestionar clientes", icon: "⚙" },
  { path: "/aejecutivos", label: "Ejecutivos", icon: "👥" },
  { section: "Conexiones" },
  { path: "/drive", label: "Google Drive", icon: "📂" },
];

export default function Layout({ ejId, onLogout }) {
  const location = useLocation();
  const ej = getEj(ejId);
  const ejs = getEjs();

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-tl" /><div className="hdr-br" />
        <div className="hdr-in">
          <div className="hdr-logo" style={{background:'rgba(255,255,255,.15)',borderRadius:8,padding:'6px 14px',color:'white',fontWeight:700,fontSize:16}}>
            PROSERVIS
          </div>
          <div className="hdr-sep" />
          <div className="hdr-t">
            <h1>Portal de Gestión — Informes de Clientes</h1>
            <p>Proservis Temporales · Sistema de reportes ejecutivos</p>
          </div>
          <div className="hdr-sel">
            <label>Ejecutivo activo:</label>
            <select value={ejId} onChange={() => {}} style={{pointerEvents:'none',opacity:0.8}}>
              <option>{ej ? ej.nom : '—'}</option>
            </select>
            <button className="btn bsm bgh" onClick={onLogout} style={{marginLeft:8,fontSize:11}}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <div className="layout">
        <nav className="side">
          {menuItems.map((item, i) => {
            if (item.section) return <div key={i} className="side-sec">{item.section}</div>;
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} className={"sb" + (active ? " on" : "")}>
                <span className="ic">{item.icon}</span>{item.label}
              </Link>
            );
          })}
        </nav>
        <main className="cnt">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
