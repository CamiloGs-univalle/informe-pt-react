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
