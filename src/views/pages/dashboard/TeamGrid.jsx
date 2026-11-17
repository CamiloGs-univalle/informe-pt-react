/**
 * views/pages/dashboard/TeamGrid.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Grid de tarjetas por ejecutivo — avance del mes, calidad y tendencia.
 * La usan tanto super_admin ("todos los equipos") como admin ("mi
 * equipo"); antes eran dos bloques casi idénticos escritos por separado
 * dentro de Dashboard.jsx.
 */
import { getInfs } from '../../../models/Informe';
import { ROLE_LABEL } from '../../../models/constants';
import { Sparkbars } from './charts';
import { fmtNum } from '../../../utils/format';
import { last4MonthsTrend } from '../equipo/helpers';
import { statusColorRel } from './utils';

export default function TeamGrid({ team, limit, esperado = 100 }) {
  // Primero quienes tienen trabajo asignado (los que más pendientes tienen, arriba); al final, los que aún no tienen.
  const ordenado = [...team].sort((a, b) => (b.total > 0) - (a.total > 0) || b.pend - a.pend || a.user.nom.localeCompare(b.user.nom));
  const rows = limit ? ordenado.slice(0, limit) : ordenado;
  const allInfs = getInfs();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 10 }}>
      {rows.map(p => {
        const infsUser = allInfs.filter(i => i.ejId === p.user.id);
        const rated = infsUser.filter(i => i.rating);
        const avg = rated.length ? rated.reduce((s, i) => s + i.rating, 0) / rated.length : null;
        const noClients = p.total === 0;
        const col = noClients ? '#9AA6A0' : statusColorRel(p.pct, esperado);
        return (
          <div key={p.user.id} style={{ background: '#fff', border: '1px solid var(--grb)', borderRadius: 10, padding: 12, borderLeft: '4px solid ' + col }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gr)', border: '1px solid var(--grb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{p.user.nom.slice(0, 2).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, overflowWrap: 'anywhere', lineHeight: 1.25 }}>{p.user.nom}</div>
                  <div style={{ fontSize: 11, color: 'var(--grt)' }}>{ROLE_LABEL[p.user.role]}{p.user.zona ? ' · ' + p.user.zona : ''}</div>
                </div>
              </div>
              {!noClients && <span style={{ fontSize: 13, fontWeight: 900, color: col, flexShrink: 0 }}>{p.pct}%</span>}
            </div>
            {noClients ? (
              <div style={{ marginTop: 9, fontSize: 12, color: 'var(--grt)', background: 'var(--gr)', borderRadius: 8, padding: '6px 8px' }}>Sin trabajo asignado todavía.</div>
            ) : (
              <>
                <div style={{ height: 6, background: '#E6EBE6', borderRadius: 20, marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ width: p.pct + '%', height: '100%', background: col, borderRadius: 20, transition: 'width .4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
                  <span style={{ fontSize: 12, color: 'var(--grt)' }}>{fmtNum(p.hechos)}/{fmtNum(p.total)} entregas</span>
                  <Sparkbars values={last4MonthsTrend(infsUser)} width={6} />
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--grb)' }}>
              <span style={{ fontSize: 11, color: 'var(--grt)' }}>Calidad: <strong style={{ color: avg ? '#9A7A10' : 'var(--grt)' }}>{avg ? avg.toFixed(1) + ' ★' : 'sin calificar'}</strong></span>
              {!noClients && <span className={'b ' + (p.pend === 0 ? 'bok' : 'bwn')} style={{ fontSize: 11 }}>{p.pend === 0 ? 'Al día' : p.pend + ' pendientes'}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
