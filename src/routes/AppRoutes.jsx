/**
 * routes/AppRoutes.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Árbol de rutas autenticado: un `Layout` con rutas hijas protegidas por
 * capacidad (ver `models/Alcance.js: capacidades` y docs/MODEL.md).
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../views/layout/Layout';
import Dashboard from '../views/pages/Dashboard';
const Clientes = lazy(() => import('../views/pages/Clientes'));
const NuevoInforme = lazy(() => import('../views/pages/NuevoInforme'));
const Guardados = lazy(() => import('../views/pages/Guardados'));
const AdminClientes = lazy(() => import('../views/pages/AdminClientes'));
const AdminEjecutivos = lazy(() => import('../views/pages/AdminEjecutivos'));
const SuperAdmin = lazy(() => import('../views/pages/SuperAdmin'));
const EquipoAdmin = lazy(() => import('../views/pages/EquipoAdmin'));
const ConfigModulos = lazy(() => import('../views/pages/ConfigModulos'));
const MisContribuciones = lazy(() => import('../views/pages/MisContribuciones'));
const TableroColaborativo = lazy(() => import('../views/pages/TableroColaborativo'));
const AdminData = lazy(() => import('../views/pages/AdminData'));
import RequireCap from './RequireCap';

// Cada pantalla se descarga solo cuando se entra a ella (el primer acceso es mucho más liviano).
const Cargando = () => <div className="route-loading" role="status">Cargando…</div>;

export default function AppRoutes({ user, realUser, ejs, onLogout, onViewAs }) {
  const guard = (cap, element) => <RequireCap user={user} cap={cap}><Suspense fallback={<Cargando />}>{element}</Suspense></RequireCap>;
  return (
    <Routes>
      <Route element={<Layout user={user} realUser={realUser} ejs={ejs} onLogout={onLogout} onViewAs={onViewAs} />}>
        <Route path="/" element={<Dashboard user={user} />} />
        <Route path="/mis-contribuciones" element={guard('contribuciones', <MisContribuciones user={user} />)} />
        <Route path="/colaborativo" element={guard('colaborativo', <TableroColaborativo user={user} />)} />
        <Route path="/clientes" element={guard('clientes', <Clientes user={user} />)} />
        <Route path="/nuevo" element={guard('nuevo', <NuevoInforme user={user} />)} />
        <Route path="/guardados" element={guard('guardados', <Guardados user={user} />)} />
        <Route path="/config-modulos" element={guard('config', <ConfigModulos user={user} />)} />
        <Route path="/equipo" element={guard('equipo', <EquipoAdmin user={user} />)} />
        <Route path="/aclientes" element={guard('aclientes', <AdminClientes user={user} />)} />
        <Route path="/aejecutivos" element={guard('aejecutivos', <AdminEjecutivos user={user} />)} />
        <Route path="/espacios" element={guard('espacios', <SuperAdmin user={user} />)} />
        <Route path="/admin-data" element={guard('admindata', <AdminData user={user} />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
