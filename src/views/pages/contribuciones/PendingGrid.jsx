/**
 * views/pages/contribuciones/PendingGrid.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Grid de clientes pendientes, clickeable — reemplaza el <select> plano que
 * había antes para que "ver mis pendientes" sea visual: cada tarjeta ya
 * muestra el estado (sin iniciar / en proceso / con corrección) antes de
 * entrar a trabajar en ella.
 */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';

export default function PendingGrid({ items, selected, onSelect }) {
  if (!items.length) {
    return <div className="alrt avd">¡Sin pendientes! Todos tus clientes están al día para este período ✓</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 10 }}>
      {items.map(({ cli, contrib }) => {
        const estado = contrib?.estado || ESTADOS.PENDIENTE;
        const meta = ESTADO_META[estado];
        const isSel = selected === cli.id;
        return (
          <button key={cli.id} type="button" onClick={() => onSelect(cli.id)} style={{
            textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
            border: isSel ? '2px solid #168A43' : '1.5px solid ' + meta.color + '33',
            background: isSel ? '#F1FAF4' : '#fff', borderRadius: 10, padding: '11px 13px',
            display: 'flex', flexDirection: 'column', gap: 5, transition: 'all .15s',
            boxShadow: isSel ? '0 2px 8px rgba(22,138,67,.15)' : '0 1px 3px rgba(0,0,0,.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--tx)' }}>{cli.nom}</span>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>
            <span style={{ fontSize: 10, color: 'var(--grt)' }}>{cli.nit || 'sin NIT'}</span>
          </button>
        );
      })}
    </div>
  );
}
