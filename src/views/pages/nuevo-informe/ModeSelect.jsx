/**
 * views/pages/nuevo-informe/ModeSelect.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * First screen of the wizard: choose "automático" (Drive/Excel) vs
 * "manual" (field by field). Purely presentational.
 */
export default function ModeSelect({ onSelect }) {
  return (
    <div>
      <div className="ph">Nuevo informe mensual</div>
      <div className="ps">Elige cómo quieres generar el informe</div>
      <div className="modo-tabs">
        <div className="modo-tab" onClick={() => onSelect('auto')}>
          <span className="mt-ico">🚀</span>
          <div className="mt-tit">Automático con Drive</div>
          <div className="mt-sub">Conecta tu Google Drive o sube los Excel. El sistema extrae los datos automáticamente y genera el informe.</div>
        </div>
        <div className="modo-tab" onClick={() => onSelect('manual')}>
          <span className="mt-ico">✏️</span>
          <div className="mt-tit">Manual — Campo a campo</div>
          <div className="mt-sub">Llena cada sección del formulario tú mismo. Ideal si no tienes archivos Excel o quieres control total.</div>
        </div>
      </div>
      <div className="card">
        <div className="ct">💡 ¿Cuál elegir?</div>
        <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.8 }}>
          <strong>Automático:</strong> Rápido y preciso. Subes los Excel de Headcount, Selección, Rotación, SST y Nómina, y el sistema llena todo solo.<br/>
          <strong>Manual:</strong> Control total. Llenas cada campo paso a paso, ideal para datos que no están en Excel.
        </div>
      </div>
    </div>
  );
}
