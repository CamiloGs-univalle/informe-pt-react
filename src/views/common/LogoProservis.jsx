/**
 * views/common/LogoProservis.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Logotipo de Proservis dibujado en SVG (se escala sin pixelarse y no depende
 * de ningún archivo externo que pueda romperse). Reemplaza al antiguo
 * `assets/logos.js`, que entregaba un SVG con cabecera de PNG y por eso salía
 * como imagen rota en el login y en la cabecera.
 */
export function LogoProservis({ height = 32, onDark = false }) {
  const verde = '#168A43';
  const texto = onDark ? '#FFFFFF' : '#12212D';
  return (
    <svg height={height} viewBox="0 0 168 40" role="img" aria-label="Proservis" style={{ display: 'block', width: 'auto' }}>
      <rect x="0" y="4" width="32" height="32" rx="8" fill={verde} />
      <path d="M9 26V14h7.2a4.6 4.6 0 0 1 0 9.2H13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="21" y="9" width="6" height="6" rx="1.5" fill="#E8BB26" />
      <text x="40" y="27" fontFamily="'Segoe UI', Arial, sans-serif" fontSize="21" fontWeight="800" fill={texto} letterSpacing="-0.3">Proservis</text>
    </svg>
  );
}
