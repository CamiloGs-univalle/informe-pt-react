/**
 * views/pages/equipo/TeamPod.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Un área/departamento como una "sala" propia del equipo — encabezado con
 * el color y la descripción que ya tiene el área en `DB.areas`, y adentro
 * la cuadrícula de tarjetas de sus integrantes. Con varias áreas (el caso
 * típico de Super Admin) esto da la sensación de recorrer distintos
 * equipos/oficinas de la empresa; con una sola área (el caso típico de un
 * Admin) sigue siendo simplemente una sección bien enmarcada.
 */
import TeamMemberCard from './TeamMemberCard';
import { areaIcon } from './helpers';

export default function TeamPod({ area, members, wss, allInfs, onEdit, onDelete, onQuickAssign }) {
  const avgPct = members.length ? Math.round(members.reduce((s, m) => s + m.pct, 0) / members.length) : 0;
  return (
    <div className="team-pod">
      <div className="team-pod-head" style={{ background: `linear-gradient(90deg, ${area.color}1F, transparent 85%)`, borderLeft: `4px solid ${area.color}` }}>
        <div className="team-pod-icon" style={{ background: area.color }}>{areaIcon(area.nombre)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{area.nombre}</div>
          <div style={{ fontSize: 10.5, color: 'var(--grt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {members.length} persona{members.length !== 1 ? 's' : ''}{area.descripcion ? ' · ' + area.descripcion : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: area.color }}>{avgPct}%</div>
          <div style={{ fontSize: 9, color: 'var(--grt)' }}>avance prom.</div>
        </div>
      </div>
      <div className="team-grid">
        {members.map(p => (
          <TeamMemberCard key={p.user.id} p={p} wss={wss} allInfs={allInfs}
            onEdit={onEdit} onDelete={onDelete} onQuickAssign={onQuickAssign} />
        ))}
      </div>
    </div>
  );
}
