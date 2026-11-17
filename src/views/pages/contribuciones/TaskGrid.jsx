/** Tarjetas de lo que le toca subir a la persona: una por cliente × área, con su estado. */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';
import { fmtNit } from '../../../utils/format';
import ClienteLogo from '../../common/ClienteLogo';

export default function TaskGrid({ items, selectedKey, onSelect, mostrarArea }) {
  return (
    <div className="grid-auto">
      {items.map(({ cli, area, contrib }) => {
        const estado = contrib?.estado || ESTADOS.PENDIENTE;
        const meta = ESTADO_META[estado];
        const key = cli.id + '|' + area.id;
        const sel = selectedKey === key;
        return (
          <button key={key} type="button" className={'task-card' + (sel ? ' sel' : '')} style={{ borderLeftColor: meta.color }} onClick={() => onSelect(cli, area)} aria-pressed={sel}>
            <span className="task-top">
              <ClienteLogo cli={cli} size={36} />
              <span className="task-nom">{cli.nom}</span>
            </span>
            <span className="chip" style={{ background: meta.bg, borderColor: meta.color + '66', color: estado === ESTADOS.COMPLETADO ? '#7A6010' : meta.color, alignSelf: 'flex-start' }}>{meta.icon} {meta.label}</span>
            <span className="task-sub">{mostrarArea ? area.nombre + ' · ' : ''}{cli.nit ? 'NIT ' + fmtNit(cli.nit) : 'Sin NIT'}</span>
            {estado === ESTADOS.RECHAZADO && contrib?.obs && <span className="task-obs">“{contrib.obs}”</span>}
            <span className="task-cta">{estado === ESTADOS.PENDIENTE ? 'Empezar →' : estado === ESTADOS.RECHAZADO ? 'Corregir →' : estado === ESTADOS.EN_PROCESO ? 'Continuar →' : 'Ver →'}</span>
          </button>
        );
      })}
    </div>
  );
}
