import "./style.css";
import "./style2.css";
import { HashRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Dashboard from "./components/Dashboard";
import Clientes from "./components/Clientes";
import Nuevo from "./components/Nuevo";
import Guardados from "./components/Guardados";
import Admin from "./components/Admin";

const menuItems = [
  { key: "/", label: "Dashboard", icon: "📊" },
  { key: "/clientes", label: "Mis Clientes", icon: "👥" },
  { key: "/nuevo", label: "Nuevo Informe", icon: "➕" },
  { key: "/guardados", label: "Informes Guardados", icon: "📁" },
  { key: "/admin", label: "Administración", icon: "⚙️" },
];

function Layout() {
  const location = useLocation();
  const [nombre] = useState("Ejecutivo Proservis");

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <Link to="/" className="header-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M12 7v5l5 5" />
            </svg>
            Informe PT
          </Link>
          <div className="header-user">
            <span>{nombre}</span>
          </div>
        </div>
      </header>

      <nav className="sidebar">
        {menuItems.map(item => (
          <Link
            key={item.key}
            to={item.key}
            className={"sidebar-item" + (location.pathname === item.key ? " active" : "")}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/nuevo" element={<Nuevo />} />
          <Route path="/guardados" element={<Guardados />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}