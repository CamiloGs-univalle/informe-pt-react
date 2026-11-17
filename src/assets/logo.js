/**
 * assets/logo.js
 * ─────────────────────────────────────────────────────────────────────────
 * Logotipo de Proservis como cadena SVG / data URI, para usarlo en los
 * informes HTML (que se descargan como archivo suelto y no pueden depender de
 * componentes de React). Para la interfaz usa `views/common/LogoProservis.jsx`.
 */
export function logoSvg({ onDark = false } = {}) {
  const texto = onDark ? '#FFFFFF' : '#12212D';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 40" width="168" height="40"><rect x="0" y="4" width="32" height="32" rx="8" fill="#168A43"/><path d="M9 26V14h7.2a4.6 4.6 0 0 1 0 9.2H13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="21" y="9" width="6" height="6" rx="1.5" fill="#E8BB26"/><text x="40" y="27" font-family="Segoe UI, Arial, sans-serif" font-size="21" font-weight="800" fill="${texto}" letter-spacing="-0.3">Proservis</text></svg>`;
}

export function logoDataUri(opts) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg(opts));
}
