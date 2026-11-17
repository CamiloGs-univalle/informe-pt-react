/** Resumen de solo lectura de lo que un área subió para un cliente y período. */
import Modal from '../../common/Modal';
import { ESTADO_META } from '../../../models/Contribucion';
import { MODULOS } from '../../../models/constants';
import { fmtFechaHora } from '../../../utils/format';

function resumen(datos) {
  return Object.entries(datos || {}).filter(([k]) => !['sst_issa', 'periodo'].includes(k)).filter(([, v]) => v != null && (typeof v !== 'object' || Object.keys(v).length)).map(([k, v]) => {
    const mod = MODULOS.find(m => m.id === k);
    const label = k === 'sst_raw' ? 'Archivo de SST (ISSA)' : (mod?.label || k);
    if (Array.isArray(v)) return [label, v.length === 1 ? '1 registro' : v.length + ' registros'];
    if (typeof v === 'object') return [label, 'Datos cargados'];
    return [label, String(v)];
  });
}

export default function AporteModal({ info, onClose }) {
  const c = info?.contrib;
  const meta = c ? ESTADO_META[c.estado] : null;
  const filas = resumen(c?.datos);
  return (
    <Modal open={!!info} onClose={onClose} title={info ? `Aporte de ${info.area.nombre}` : ''}>
      {info && (
        <>
          <div className="chip" style={{ marginBottom: 10 }}>{info.cliNom}</div>
          {meta && <p><strong style={{ color: meta.color }}>{meta.label}</strong> · actualizado {fmtFechaHora(c.updatedAt)}</p>}
          {c?.obs && <div className="quote">“{c.obs}”</div>}
          <h4 style={{ margin: '14px 0 6px', fontSize: 14 }}>Lo que subió</h4>
          {filas.length ? (
            <ul className="todo-list">{filas.map(([k, v]) => <li key={k}><div className="todo-main"><div className="todo-t">{k}</div><div className="todo-s">{v}</div></div></li>)}</ul>
          ) : <p className="text-muted">Todavía no hay datos cargados en este aporte.</p>}
          <div className="brow"><button type="button" className="btn bgh" onClick={onClose}>Cerrar</button></div>
        </>
      )}
    </Modal>
  );
}
