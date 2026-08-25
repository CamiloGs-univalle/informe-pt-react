import { Link, useLocation, Outlet } from "react-router-dom";
import { getEj } from "../store";
import { LB } from "../logos";

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
];

export default function Layout({ ejId, onLogout, onEjChange, ejs }) {
  const location = useLocation();
  const ej = getEj(ejId);

  return (
    <>
      <header className="hdr">
        <div className="hdr-tl"></div>
        <div className="hdr-br"></div>
        <div className="hdr-in">
          <img className="hdr-logo" src={"data:image/png;base64," + LB} alt="Proservis" />
          <div className="hdr-sep"></div>
          <div className="hdr-t">
            <h1>Portal de Gestión — Informes de Clientes</h1>
            <p>Proservis Temporales · Sistema de reportes ejecutivos</p>
          </div>
          <div className="hdr-sel">
            <label>Ejecutivo activo:</label>
            <select value={ejId} onChange={e => onEjChange(e.target.value)}>
              <option value="">— Seleccionar ejecutivo —</option>
              {(ejs || []).map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
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
    </>
  );
}
