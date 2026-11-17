/** Tarjeta de una persona del equipo: avance del período, calidad y accesos directos. */
import { ROLE_LABEL } from '../../../models/constants';
import { timeAgo, fmtDec, plural, iniciales } from '../../../utils/format';
import { VerComoBtn } from '../../common/ViewAs';
import { Gauge, Sparkbars } from '../dashboard/charts';
import { ROLE_COLOR, avgQuality, lastActivityTs, last4MonthsTrend } from './helpers';

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
const TIPO = { lider: 'informes del mes', aporte: 'aportes del mes', ambos: 'entregas del mes (informes y aportes)', ninguno: '' };

export default function TeamMemberCard({ p, allInfs, onClientes, onEdit }) {
  const u = p.user;
  const infsUser = allInfs.filter(i => i.ejId === u.id);
  const calidad = avgQuality(u.id, allInfs);
  const ultima = lastActivityTs(u.id, allInfs);
  const activa = !!ultima && (Date.now() - new Date(ultima).getTime()) < SEMANA_MS;
  const sinClientes = p.total === 0;
  const inactivo = u.activo === false;
  return (
    <div className={'team-card' + (inactivo ? ' inactive' : '')}>
      <div className="tm-top">
        <div className="team-avatar" style={{ background: ROLE_COLOR[u.role] || ROLE_COLOR.usuario }}>
          {iniciales(u.nom)}
          <span className={'team-presence' + (activa ? ' on' : '')} title={ultima ? `Último informe: ${timeAgo(ultima)}` : 'Todavía no genera informes'} />
        </div>
        <div className="tm-id">
          <div className="tm-n">{u.nom}{inactivo && <span className="chip ro" style={{ marginLeft: 6 }}>Inactiva</span>}</div>
          <div className="tm-m" title={u.email}>{u.email}</div>
          <div className="tm-m">{ROLE_LABEL[u.role]}{u.zona ? ' · ' + u.zona : ''}</div>
        </div>
      </div>

      <div className="tm-prog">
        <Gauge pct={p.pct} size={54} stroke={6} />
        <div className="tm-prog-t">
          {sinClientes ? <div className="text-muted">Sin clientes asignados todavía.</div> : (
            <>
              <div><strong>{p.hechos}</strong> de {p.total} {TIPO[p.tipo]}</div>
              <div className="tm-prog-r">
                <span className={'chip ' + (p.pend === 0 ? 'vd' : 'am')}>{p.pend === 0 ? 'Al día' : plural(p.pend, 'pendiente')}</span>
                <Sparkbars values={last4MonthsTrend(infsUser)} width={6} height={22} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="tm-foot">
        <span className="text-muted">{calidad ? <>Calidad <strong>{fmtDec(calidad)} ★</strong></> : 'Sin calificaciones'}</span>
        <span className="chip">{plural(p.total, 'cliente')}</span>
      </div>
      <div className="tm-acts">
        <button type="button" className="btn bgh bsm" onClick={() => onClientes(u.id)}>Ver clientes</button>
        <button type="button" className="btn bgh bsm" onClick={() => onEdit(u.id)}>Editar persona</button>
        <VerComoBtn persona={u} actualId={null} />
      </div>
    </div>
  );
}
