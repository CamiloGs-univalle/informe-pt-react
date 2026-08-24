import { Link, useLocation, Outlet } from "react-router-dom";
import { getEj } from "../store";

const menuItems = [
  { section: "Principal" },
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/clientes", label: "Mis clientes", icon: "👥" },
  { path: "/nuevo", label: "Nuevo informe", icon: "📝" },
  { section: "Historial" },
  { path: "/guardados", label: "Informes guardados", icon: "📋" },
  { section: "Administración" },
  { path: "/aclientes", label: "Gestionar clientes", icon: "⚙️" },
  { path: "/aejecutivos", label: "Ejecutivos", icon: "👤" },
  { section: "Conexiones" },
  { path: "/drive", label: "Google Drive", icon: "📁" },
];

export default function Layout({ ejId, onLogout }) {
  const location = useLocation();
  const ej = getEj(ejId);

  const initials = ej
    ? ej.nom
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "??";

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-logo">PRO</div>
        <div className="hdr-sep" />
        <div className="hdr-t">
          <h1>Portal de Gestión</h1>
          <p>Proservis Temporales · Sistema de reportes ejecutivos</p>
        </div>
        <div className="hdr-right">
          <div className="hdr-user">
            <div className="hdr-avatar">{initials}</div>
            <div>
              <div className="hdr-username">{ej ? ej.nom : ""}</div>
              <div className="hdr-role">{ej ? ej.zona : ""}</div>
            </div>
          </div>
          <button className="hdr-logout" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="layout">
        <nav className="side">
          {menuItems.map((item, i) => {
            if (item.section) {
              return (
                <div key={i} className="side-sec">
                  {item.section}
                </div>
              );
            }
            const active =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={"side-item" + (active ? " on" : "")}
              >
                <span className="ic">{item.icon}</span>
                {item.label}
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
