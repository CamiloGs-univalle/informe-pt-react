import "./style.css";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { loadDB } from "./store";
import { ToastProvider } from "./components/Toast";
import Login from "./components/Login";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Clientes from "./components/Clientes";
import NuevoInforme from "./components/NuevoInforme";
import Guardados from "./components/Guardados";
import AdminClientes from "./components/AdminClientes";
import AdminEjecutivos from "./components/AdminEjecutivos";
import DriveExplorer from "./components/DriveExplorer";

export default function App() {
  const [ejId, setEjId] = useState(() => localStorage.getItem('ps_ej_activo') || null);

  useEffect(() => { loadDB(); }, []);

  const handleLogin = (id) => {
    setEjId(id);
    localStorage.setItem('ps_ej_activo', id);
  };

  const handleLogout = () => {
    setEjId(null);
    localStorage.removeItem('ps_ej_activo');
  };

  if (!ejId) {
    return (
      <ToastProvider>
        <Login onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout ejId={ejId} onLogout={handleLogout} />}>
            <Route path="/" element={<Dashboard ejId={ejId} />} />
            <Route path="/clientes" element={<Clientes ejId={ejId} />} />
            <Route path="/nuevo" element={<NuevoInforme ejId={ejId} />} />
            <Route path="/guardados" element={<Guardados />} />
            <Route path="/aclientes" element={<AdminClientes />} />
            <Route path="/aejecutivos" element={<AdminEjecutivos />} />
            <Route path="/drive" element={<DriveExplorer />} />
          </Route>
        </Routes>
      </HashRouter>
    </ToastProvider>
  );
}