/**
 * views/pages/contribuciones/RecomendacionesPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Contribuciones que el Ejecutivo devolvió con correcciones — el feedback
 * más directo y concreto que recibe el trabajador sobre su propio trabajo.
 * Se muestra arriba de todo lo demás, con un badge que pulsa, porque esto
 * necesita acción y no es solo informativo.
 */
import { fmtPerLong, timeAgo } from '../../../utils/format';

export default function RecomendacionesPanel({ items, onFix }) {
  if (!items.length) return null;
  return (
    <div className="card" style={{ borderLeft: '4px solid #C0392B', background: '#FFFBFA' }}>
      <div className="ct" style={{ color: '#C0392B', borderBottomColor: '#F6D7D2', justifyContent: 'space-between' }}>
        <span>↩️ Correcciones pedidas por tu Ejecutivo</span>
        <span className="pulse-dot" style={{ background: '#C0392B', color: '#fff', borderRadius: 20, padding: '2px 9px', fontSize: 10, fontWeight: 800 }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(c => (
          <div key={c.id} style={{ background: '#fff', border: '1px solid #F6D7D2', borderRadius: 8, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 12 }}>{c.cliNom} <span style={{ fontWeight: 600, color: 'var(--grt)' }}>· {fmtPerLong(c.per)}</span></div>
              <div style={{ fontSize: 11, color: '#8B1A1A', marginTop: 3, lineHeight: 1.5 }}>💬 {c.obs || 'Sin motivo detallado — contacta a tu Ejecutivo.'}</div>
              <div style={{ fontSize: 10, color: 'var(--grt)', marginTop: 3 }}>{timeAgo(c.updatedAt)}</div>
            </div>
            <button className="btn bro bsm" onClick={() => onFix(c)}>✏️ Corregir ahora</button>
          </div>
        ))}
      </div>
    </div>
  );
}
