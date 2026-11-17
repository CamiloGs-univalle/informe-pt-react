/**
 * services/logos.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Resuelve el logo de un cliente. Orden de prioridad:
 *   1. `cliente.logo` (URL o imagen subida desde "Gestionar clientes").
 *   2. Archivo de `public/logos/clientes/` cuyo nombre empieza por el NIT
 *      (índice `manifest.json`, generado por `scripts/build-logos-manifest.mjs`).
 * Si no hay ninguno devuelve null y la interfaz muestra las iniciales.
 */
let manifest = null;
let pending = null;
const listeners = new Set();

function load() {
  if (manifest || pending) return;
  pending = fetch('/logos/clientes/manifest.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then(m => { manifest = m || {}; listeners.forEach(fn => fn()); });
}

export function onLogosReady(fn) {
  listeners.add(fn);
  load();
  return () => listeners.delete(fn);
}

const nitKey = nit => String(nit || '').replace(/\D/g, '').replace(/^0+/, '');

/** URL del logo del cliente, o null. */
export function getLogoUrl(cli) {
  if (!cli) return null;
  if (cli.logo) return cli.logo;
  if (!manifest) { load(); return null; }
  const file = manifest[nitKey(cli.nit)] || manifest[String(cli.nit || '')];
  return file ? '/logos/clientes/' + encodeURIComponent(file) : null;
}

/** ¿Tiene logo (propio o de la carpeta)? Solo fiable cuando el índice ya cargó. */
export function tieneLogo(cli) {
  return !!getLogoUrl(cli);
}
