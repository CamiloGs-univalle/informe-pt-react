/**
 * routes/AppRoutes.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * The authenticated route tree: one `Layout` shell with role-gated child
 * routes. Extracted from `App.jsx` to keep routing declarations separate
 * from session/auth bootstrapping.
 *
 * Role map (see docs/MODEL.md for the full RBAC table):
 *  - usuario, admin, super_admin → Dashboard, Clientes, Nuevo informe, Config módulos
 *  - admin, super_admin          → Mi equipo, Gestionar clientes, Personas
 *  - super_admin                 → Espacios y Áreas
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../views/layout/Layout';
import Dashboard from '../views/pages/Dashboard';
import Clientes from '../views/pages/Clientes';
import NuevoInforme from '../views/pages/NuevoInforme';
import Guardados from '../views/pages/Guardados';
import AdminClientes from '../views/pages/AdminClientes';
import AdminEjecutivos from '../views/pages/AdminEjecutivos';
import SuperAdmin from '../views/pages/SuperAdmin';
import EquipoAdmin from '../views/pages/EquipoAdmin';
import ConfigModulos from '../views/pages/ConfigModulos';
import MisContribuciones from '../views/pages/MisContribuciones';
import TableroColaborativo from '../views/pages/TableroColaborativo';
import RequireRole from './RequireRole';

export default function AppRoutes({ user, ejId, ejs, onLogout, onEjChange }) {
  return (
    <Routes>
      <Route element={<Layout user={user} ejId={ejId} onLogout={onLogout} ejs={ejs} onEjChange={onEjChange} />}>
        <Route path="/" element={<Dashboard user={user} ejId={ejId} />} />

        {/* Colaborativo */}
        <Route path="/colaborativo" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><TableroColaborativo user={user} ejId={ejId} /></RequireRole>} />
        <Route path="/mis-contribuciones" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><MisContribuciones user={user} /></RequireRole>} />
        {/* Usuario y superiores */}
        <Route path="/clientes" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><Clientes ejId={ejId} user={user} /></RequireRole>} />
        <Route path="/nuevo" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><NuevoInforme ejId={ejId} user={user} /></RequireRole>} />
        <Route path="/guardados" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><Guardados user={user} /></RequireRole>} />
        <Route path="/config-modulos" element={<RequireRole user={user} roles={['usuario', 'admin', 'super_admin']}><ConfigModulos user={user} /></RequireRole>} />

        {/* Admin */}
        <Route path="/equipo" element={<RequireRole user={user} roles={['admin', 'super_admin']}><EquipoAdmin user={user} /></RequireRole>} />
        <Route path="/aclientes" element={<RequireRole user={user} roles={['admin', 'super_admin']}><AdminClientes user={user} /></RequireRole>} />
        <Route path="/aejecutivos" element={<RequireRole user={user} roles={['admin', 'super_admin']}><AdminEjecutivos user={user} /></RequireRole>} />

        {/* Super Admin */}
        <Route path="/espacios" element={<RequireRole user={user} roles={['super_admin']}><SuperAdmin user={user} /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
