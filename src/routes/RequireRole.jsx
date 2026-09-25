/**
 * routes/RequireRole.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Route guard: renders `children` only if `user` exists and (when `roles`
 * is given) `user.role` is included in it; otherwise redirects to "/" or
 * shows a friendly "acceso restringido" message.
 *
 * Extracted from `App.jsx` so the route tree in `routes/AppRoutes.jsx`
 * reads declaratively.
 */
import { Navigate } from 'react-router-dom';

export default function RequireRole({ user, roles, children }) {
  if (!user) return <Navigate to="/" replace />;
  if (roles && roles.length && !roles.includes(user.role)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 42, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ro)' }}>Acceso restringido Señor</div>
        <div style={{ fontSize: 12, color: 'var(--grt)', marginTop: 6 }}>
          Tu rol <strong>{user.role}</strong> no tiene permiso para esta sección.
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--grt)' }}>Roles permitidos: {roles.join(', ')}</div>
      </div>
    );
  }
  return children;
}
