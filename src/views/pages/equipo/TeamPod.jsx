/** Un área con las personas que la integran y su avance promedio. */
import TeamMemberCard from './TeamMemberCard';
import { areaIcon } from './helpers';
import { plural } from '../../../utils/format';

export default function TeamPod({ area, members, allInfs, onClientes, onEdit }) {
  const avg = members.length ? Math.round(members.reduce((s, m) => s + m.pct, 0) / members.length) : 0;
  return (
    <section className="team-pod">
      <div className="team-pod-head" style={{ background: `linear-gradient(90deg, ${area.color}22, transparent 85%)`, borderLeft: `5px solid ${area.color}` }}>
        <div className="team-pod-icon" style={{ background: area.color }} aria-hidden="true">{areaIcon(area.nombre)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="pod-t">{area.nombre}</h2>
          <div className="text-muted">{plural(members.length, 'persona')}{area.descripcion ? ' · ' + area.descripcion : ''}</div>
        </div>
        <div className="pod-avg"><div className="pod-avg-n" style={{ color: area.color }}>{avg}%</div><div className="text-muted">avance medio</div></div>
      </div>
      <div className="team-grid">
        {members.map(p => <TeamMemberCard key={p.user.id} p={p} allInfs={allInfs} onClientes={onClientes} onEdit={onEdit} />)}
      </div>
    </section>
  );
}
