/** Todo lo que la persona ha subido, con el veredicto del ejecutivo cuando lo hay. */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';
import { fmtPerLong, timeAgo, plural } from '../../../utils/format';
import EmptyState from '../../common/EmptyState';

export default function HistorialList({ items, onOpen }) {
  if (!items.length) return <EmptyState icon="🕘" title="Aún no has subido aportes">Cuando guardes un borrador o envíes tu parte de un cliente, quedará registrado aquí.</EmptyState>;
  return (
    <ul className="hist-list">
      {items.map(c => {
        const meta = ESTADO_META[c.estado] || ESTADO_META[ESTADOS.PENDIENTE];
        return (
          <li key={c.id} style={{ borderLeftColor: meta.color }}>
            <div className="hist-main">
              <div className="hist-t">{c.cliNom} <span className="chip" style={{ background: meta.bg, borderColor: meta.color + '66', color: c.estado === ESTADOS.COMPLETADO ? '#7A6010' : meta.color }}>{meta.label}</span></div>
              <div className="hist-s">{c.areaNom} · {fmtPerLong(c.per)} · {timeAgo(c.updatedAt)}{c.rechazosCount ? ` · ${plural(c.rechazosCount, 'corrección', 'correcciones')} pedidas` : ''}</div>
              {c.estado === ESTADOS.RECHAZADO && c.obs && <div className="hist-obs">“{c.obs}”</div>}
            </div>
            <button type="button" className="btn bgh bsm" onClick={() => onOpen(c)}>{[ESTADOS.COMPLETADO, ESTADOS.VALIDADO].includes(c.estado) ? 'Ver cómo quedó' : 'Abrir y seguir'}</button>
          </li>
        );
      })}
    </ul>
  );
}
