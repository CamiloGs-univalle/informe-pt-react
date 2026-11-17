/** Aportes que el ejecutivo devolvió: el feedback más concreto que recibe la persona. */
import { fmtPerLong, timeAgo } from '../../../utils/format';

export default function RecomendacionesPanel({ items, onFix }) {
  if (!items.length) return null;
  return (
    <div className="card reco-card">
      <div className="ct" style={{ color: '#8B1A1A' }}>Correcciones pedidas por tu ejecutivo <span className="chip ro" style={{ marginLeft: 8 }}>{items.length}</span></div>
      <ul className="todo-list">
        {items.map(c => (
          <li key={c.id}>
            <div className="todo-main">
              <div className="todo-t">{c.cliNom} <span className="text-muted" style={{ fontWeight: 600 }}>· {c.areaNom} · {fmtPerLong(c.per)}</span></div>
              <div className="todo-s" style={{ color: '#8B1A1A' }}>{c.obs || 'Sin detalle: contacta a tu ejecutivo.'} <span className="text-muted">({timeAgo(c.updatedAt)})</span></div>
            </div>
            <button type="button" className="btn bro bsm" onClick={() => onFix(c)}>Corregir ahora</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
