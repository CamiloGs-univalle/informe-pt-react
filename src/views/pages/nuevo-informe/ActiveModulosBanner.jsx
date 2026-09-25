/**
 * views/pages/nuevo-informe/ActiveModulosBanner.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Small banner reminding the user which report modules are active for this
 * cliente/usuario (configured in ConfigModulos), with a shortcut to go
 * change that configuration.
 */
export default function ActiveModulosBanner({ activeModulos }) {
  if (!activeModulos.length) return null;
  return (
    <div style={{ background: '#FDF6D8', border: '1px solid #E8D78A', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#7A6010' }}>⚙️ Módulos activos ({activeModulos.length}):</span>
      {activeModulos.map(m => <span key={m} className="b" style={{ background: '#fff', border: '1px solid #E8D78A', color: '#7A6010', fontSize: 10 }}>{m}</span>)}
      <a href="#/config-modulos" style={{ marginLeft: 'auto', fontSize: 11, color: '#168A43', fontWeight: 700 }}>Configurar →</a>
    </div>
  );
}
