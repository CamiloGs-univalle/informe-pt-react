import { fmtPerLong, periodoActual } from '../../utils/format';

/** Suma/resta meses a un período YYYY-MM sin pasar por UTC. */
export function shiftPeriodo(per, delta) {
  const [y, m] = per.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/**
 * Selector de período en español: ‹ Octubre 2026 ›  (+ "Mes actual").
 * Reemplaza al <input type="month">, que muestra el mes en el idioma del
 * navegador y no deja claro cómo cambiarlo.
 */
export default function PeriodPicker({ value, onChange, max = '', label = 'Período' }) {
  const actual = periodoActual();
  const siguienteBloqueado = max && value >= max;
  return (
    <div className="period-pick" role="group" aria-label={label}>
      <span className="period-pick-l">{label}</span>
      <button type="button" className="btn bgh bsm" onClick={() => onChange(shiftPeriodo(value, -1))} aria-label="Mes anterior" title="Mes anterior">‹</button>
      <strong className="period-pick-v">{fmtPerLong(value)}</strong>
      <button type="button" className="btn bgh bsm" onClick={() => onChange(shiftPeriodo(value, 1))} disabled={!!siguienteBloqueado} aria-label="Mes siguiente" title="Mes siguiente">›</button>
      {value !== actual && <button type="button" className="btn bgh bsm" onClick={() => onChange(actual)}>Mes actual</button>}
    </div>
  );
}
