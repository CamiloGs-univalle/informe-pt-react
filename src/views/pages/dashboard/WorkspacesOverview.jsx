/**
 * views/pages/dashboard/WorkspacesOverview.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * "Espacios — vista global" (solo super_admin): cada Workspace con sus
 * áreas, clientes y un anillo de avance del mes calculado a partir de los
 * usuarios asignados a ese espacio.
 */
import { Link } from 'react-router-dom';
import { getAreas } from '../../../models/Workspace';
import { getClis } from '../../../models/Cliente';
import { getEjs } from '../../../models/Ejecutivo';
import { getInfs } from '../../../models/Informe';
import { Gauge } from './charts';

function workspacePct(w) {
  const people = getEjs().filter(e => e.workspaceId === w.id && e.role === 'usuario');
  if (!people.length) return null;
  const hoy = new Date();
  const per = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
  const clis = getClis().filter(c => people.some(p => p.id === c.ejId));
  if (!clis.length) return null;
  const done = getInfs().filter(i => i.per === per && clis.some(c => c.id === i.cliId)).length;
  return Math.round((done / clis.length) * 100);
}

export default function WorkspacesOverview({ workspaces }) {
  if (!workspaces.length) {
    return <div style={{ color: 'var(--grt)', fontSize: 12 }}>Aún no hay espacios creados. <Link to="/espacios" style={{ color: 'var(--vd)', fontWeight: 700 }}>Crea el primero →</Link></div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10 }}>
      {workspaces.map(w => {
        const pct = workspacePct(w);
        const clientesCount = getClis().filter(c => c.workspaceId === w.id || !c.workspaceId).length;
        return (
          <div key={w.id} style={{ background: 'var(--gr)', borderRadius: 10, padding: 12, borderLeft: '4px solid ' + (w.color || '#12212D'), display: 'flex', gap: 10, alignItems: 'center' }}>
            {pct !== null && <Gauge pct={pct} size={44} stroke={5} />}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{w.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--grt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.descripcion}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--vd)', fontWeight: 700 }}>{getAreas(w.id).length} áreas · {clientesCount} clientes</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
