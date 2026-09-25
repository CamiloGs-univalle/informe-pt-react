/**
 * views/pages/dashboard/RecentRatings.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Últimas calificaciones de clientes con su feedback — el mismo dato que
 * Guardados registra (1-5 ★ + comentario), traído al Dashboard para que el
 * ejecutivo lo tenga presente antes de la próxima entrega sin tener que ir
 * a buscarlo en el historial.
 */
import { Link } from 'react-router-dom';
import Stars from '../../common/Stars';
import { fmtPerLong } from '../../../utils/format';

export default function RecentRatings({ ratings, limit = 5, teamView = false }) {
  const rows = ratings.slice(0, limit);
  if (!rows.length) {
    return (
      <div style={{ color: 'var(--grt)', fontSize: 12 }}>
        Aún no hay informes calificados. Cuando un cliente reciba su informe, califícalo en{' '}
        <Link to="/guardados" style={{ color: 'var(--vd)', fontWeight: 700 }}>Guardados</Link> para llevar registro.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(inf => (
        <div key={inf.id} style={{
          background: inf.rating <= 3 ? '#FDF0EE' : 'var(--gr)', border: '1px solid ' + (inf.rating <= 3 ? '#F2C4BC' : 'var(--grb)'),
          borderRadius: 8, padding: '9px 12px', display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap',
        }}>
          <Stars value={inf.rating} readonly size={13} />
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {inf.cliNom}{teamView && inf.ejNom ? ' · ' + inf.ejNom : ''} <span style={{ fontWeight: 500, color: 'var(--grt)' }}>({fmtPerLong(inf.per)})</span>
            </div>
            {inf.feedback && <div style={{ fontSize: 11, color: 'var(--grt)', fontStyle: 'italic', marginTop: 2 }}>&ldquo;{inf.feedback}&rdquo;</div>}
          </div>
          {inf.rating <= 3 && <span className="b bbd" style={{ fontSize: 9, flexShrink: 0 }}>Necesita atención</span>}
        </div>
      ))}
    </div>
  );
}
