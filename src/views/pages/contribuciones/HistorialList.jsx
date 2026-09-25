/**
 * views/pages/contribuciones/HistorialList.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Todo lo que el trabajador ha subido alguna vez, en orden — para que "ver
 * mis contribuciones" sea real y no solo lo pendiente de hoy. Cada fila ya
 * trae el veredicto del Ejecutivo cuando lo hay (validado/rechazado y por
 * qué), así el historial también sirve como bitácora de feedback.
 */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';
import { fmtPerLong, timeAgo } from '../../../utils/format';

export default function HistorialList({ items }) {
  if (!items.length) {
    return <div className="alrt aam">Todavía no has subido ninguna contribución. En cuanto guardes un borrador o completes una, aparecerá aquí.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(c => {
        const meta = ESTADO_META[c.estado] || ESTADO_META[ESTADOS.PENDIENTE];
        return (
          <div key={c.id} className="fade-in" style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', borderRadius: 10,
            padding: '11px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.06)', borderLeft: '4px solid ' + meta.color,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{meta.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {c.cliNom}
                <span className="b" style={{ background: meta.bg, color: meta.color, fontWeight: 800 }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 2 }}>
                {fmtPerLong(c.per)} · {timeAgo(c.updatedAt)}
                {c.rechazosCount ? ` · ${c.rechazosCount} corrección${c.rechazosCount !== 1 ? 'es' : ''} en el camino` : ''}
              </div>
              {c.estado === ESTADOS.RECHAZADO && c.obs && (
                <div style={{ fontSize: 11, color: '#8B1A1A', marginTop: 4 }}>💬 {c.obs}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
