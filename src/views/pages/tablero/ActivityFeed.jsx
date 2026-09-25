/**
 * views/pages/tablero/ActivityFeed.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * "Pulso" de la colaboración: las últimas actualizaciones de contribuciones
 * (cualquier área, cualquier cliente) del período que el líder está viendo,
 * ordenadas por más reciente. Le da al tablero la sensación de que el
 * equipo está trabajando en simultáneo, en vez de un semáforo estático.
 * Cada item ya trae su `text` compuesto (el verbo cambia según quién actuó
 * — no es siempre "el área hizo X a Y", validar/rechazar los hace el líder).
 */
import { ESTADO_META } from '../../../models/Contribucion';
import { timeAgo } from '../../../utils/format';

export default function ActivityFeed({ items }) {
  if (!items.length) {
    return <div style={{ color: 'var(--grt)', fontSize: 12 }}>Todavía no hay actividad de tu equipo en este período.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => {
        const meta = ESTADO_META[it.estado] || ESTADO_META.pendiente;
        return (
          <div key={it.id + i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 0', borderBottom: i < items.length - 1 ? '1px solid var(--gr)' : 'none' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{it.text}</span>
            <span style={{ color: 'var(--grt)', fontSize: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(it.updatedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
