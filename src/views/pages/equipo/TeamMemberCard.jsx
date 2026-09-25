/**
 * views/pages/equipo/TeamMemberCard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Tarjeta de una persona del equipo. Reemplaza la fila plana que antes
 * vivía repetida en dos bloques separados ("Seguimiento mensual" y la
 * tabla de "Personas") — junta avance del mes, calidad, última actividad
 * y las acciones de asignar/editar/eliminar en un solo lugar, con el
 * mismo dato de siempre (`p` = { user, total, hechos, pend, pct }, tal
 * como lo entrega `getTeamMonthlyProgress`).
 */
import { ROLE_LABEL } from '../../../models/constants';
import { timeAgo } from '../../../utils/format';
import { Gauge, Sparkbars } from '../dashboard/charts';
import { ROLE_COLOR, avgQuality, lastActivityTs, last4MonthsTrend } from './helpers';

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export default function TeamMemberCard({ p, wss, allInfs, onEdit, onDelete, onQuickAssign }) {
  const u = p.user;
  const ws = wss.find(w => w.id === u.workspaceId);
  const infsUser = allInfs.filter(i => i.ejId === u.id);
  const quality = avgQuality(u.id, allInfs);
  const lastTs = lastActivityTs(u.id, allInfs);
  const activeRecently = !!lastTs && (Date.now() - new Date(lastTs).getTime()) < SEMANA_MS;
  const noClients = p.total === 0;
  const ringColor = ROLE_COLOR[u.role] || ROLE_COLOR.usuario;
  const inactive = u.activo === false;

  return (
    <div className={'team-card' + (inactive ? ' inactive' : '')}>
      {inactive && <span className="team-card-ribbon">Inactivo</span>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="team-avatar" style={{ background: ringColor }}>
          {u.nom.slice(0, 2).toUpperCase()}
          <span
            className={'team-presence' + (activeRecently ? ' on pulse-dot-vd' : '')}
            title={lastTs ? `Última actividad: ${timeAgo(lastTs)}` : 'Todavía no genera informes'}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 13.5 }}>{u.nom}</span>
            <span className="b" style={{ background: u.role === 'super_admin' ? '#12212D' : u.role === 'admin' ? '#E8F5EE' : '#FDF6D8', color: u.role === 'super_admin' ? '#fff' : u.role === 'admin' ? '#0F6B33' : '#7A6010' }}>{ROLE_LABEL[u.role]}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
          <div style={{ fontSize: 10, color: 'var(--grt)', marginTop: 2 }}>{ws?.nombre || 'Sin espacio'}{u.zona ? ' · 📍 ' + u.zona : ''}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <Gauge pct={p.pct} size={52} stroke={6} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {noClients ? (
            <div style={{ fontSize: 11, color: 'var(--grt)', background: '#fff', border: '1px dashed var(--grb)', borderRadius: 8, padding: '6px 8px' }}>Sin clientes asignados todavía.</div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--grt)' }}>{p.hechos}/{p.total} informes este mes</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, gap: 6 }}>
                <span className={'b ' + (p.pend === 0 ? 'bok' : 'bwn')}>{p.pend === 0 ? 'Al día' : p.pend + ' pendientes'}</span>
                <Sparkbars values={last4MonthsTrend(infsUser)} width={5} height={20} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--grb)' }}>
        <span style={{ fontSize: 10.5, color: 'var(--grt)' }}>⭐ <strong style={{ color: quality ? '#9A7A10' : 'var(--grt)' }}>{quality ? quality.toFixed(1) : 'sin calificar'}</strong></span>
        <span className="b bok">{p.total} cliente{p.total !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button className="btn bgh bsm" style={{ flex: 1 }} onClick={() => onQuickAssign(u.id)}>🔗 Asignar clientes</button>
        <button className="btn bgh bsm" title="Editar" onClick={() => onEdit(u)}>✏️</button>
        <button className="btn bro bsm" title="Eliminar" onClick={() => onDelete(u.id)}>🗑️</button>
      </div>
    </div>
  );
}
