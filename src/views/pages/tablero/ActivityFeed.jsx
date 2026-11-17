/** Últimas actualizaciones del equipo en el período que el líder está viendo. */
import { ESTADO_META } from '../../../models/Contribucion';
import { timeAgo } from '../../../utils/format';

export default function ActivityFeed({ items }) {
  if (!items.length) return <div className="text-muted" style={{ fontSize: 13 }}>Todavía no hay actividad del equipo en este período.</div>;
  return (
    <ul className="act-list">
      {items.map((it, i) => {
        const meta = ESTADO_META[it.estado] || ESTADO_META.pendiente;
        return (
          <li key={it.id + i}>
            <span className="act-ico" aria-hidden="true">{meta.icon}</span>
            <span className="act-txt">{it.text}</span>
            <span className="act-time">{timeAgo(it.updatedAt)}</span>
          </li>
        );
      })}
    </ul>
  );
}
