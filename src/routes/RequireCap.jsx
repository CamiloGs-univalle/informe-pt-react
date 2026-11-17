/**
 * routes/RequireRole.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Guardia de ruta por capacidad (`models/Alcance.js: capacidades`). Si la
 * persona no puede entrar a la pantalla, explica por qué y le da un camino
 * de vuelta, en vez de dejarla en un callejón sin salida.
 */
import { Link } from 'react-router-dom';
import { capacidades } from '../models/Alcance';
import EmptyState from '../views/common/EmptyState';

export default function RequireCap({ user, cap, children }) {
  if (!user || !capacidades(user)[cap]) {
    return (
      <EmptyState
        icon="🔒"
        title="No tienes acceso a esta pantalla"
        action={<Link to="/" className="btn bvd">Ir al inicio</Link>}
      >
        Tu rol o tus asignaciones actuales no incluyen esta sección. Si crees que es un error, pídele al administrador que revise tu perfil.
      </EmptyState>
    );
  }
  return children;
}
