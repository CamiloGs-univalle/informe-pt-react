/**
 * config/app.config.js
 * ─────────────────────────────────────────────────────────────────────────
 * Application-wide, non-secret configuration: app metadata and the Google
 * OAuth client id used by the Drive integration.
 *
 * Values can be overridden per environment via Vite env vars (`.env`,
 * `.env.production`, etc. — see `.env.example`). If a `VITE_*` var is not
 * set, the previous hardcoded value is used as a fallback, so this change
 * is backwards-compatible with the existing deployment.
 */

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1083881497523-uvedkll40acpcjoecq5l2fusq3bm5ufh.apps.googleusercontent.com';

/** Read-only Drive scope requested by the Drive Explorer feature. */
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

export const APP_CONFIG = {
  appName: 'Informe PT - Proservis',
  supportEmail: 'admin@proservis.com.co',
};

/** Enlace opcional a SortTime Plus (fuente complementaria de ausentismo). Vacío = no se muestra. */
export const SORTTIME_URL = import.meta.env.VITE_SORTTIME_URL || '';

/** Permiso para que Gmail deje un borrador listo con el informe adjunto (solo crea borradores; no lee ni envía). */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

/**
 * Si es true (por defecto), el ejecutivo solo puede enviar por correo los informes que un administrador aprobó.
 * Para quitar la exigencia: VITE_EXIGIR_APROBACION=false
 */
export const EXIGIR_APROBACION = String(import.meta.env.VITE_EXIGIR_APROBACION ?? 'true') !== 'false';
