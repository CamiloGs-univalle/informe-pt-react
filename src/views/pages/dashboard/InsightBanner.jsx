/**
 * views/pages/dashboard/InsightBanner.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Una sola línea, coloreada por estado, con la lectura más relevante del
 * momento — para que la persona no tenga que escanear cada KPI para saber
 * si algo necesita su atención ahora mismo. La lógica de qué mensaje mostrar
 * vive en `insight.js` (computeInsight); este archivo solo renderiza.
 */
const TONE = {
  good: { cls: 'avd', icon: '✅' },
  warn: { cls: 'aam', icon: '⚠️' },
  bad: { cls: 'aro', icon: '🔴' },
};

export default function InsightBanner({ insight }) {
  const t = TONE[insight.tone];
  return (
    <div className={'alrt ' + t.cls} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
      <span>{t.icon}</span><span>{insight.text}</span>
    </div>
  );
}
