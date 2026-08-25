/* ═══════════════════════════════════════════════════════════
   Google Drive Configuration
   Pega tu Client ID de Google Cloud aquí
   ═══════════════════════════════════════════════════════════ */

// Tu Client ID de Google Cloud Console
// Lo encuentras en: console.cloud.google.com > APIs & Services > Credentials
export const GOOGLE_CLIENT_ID = '1083881497523-uvedkll40acpcjoecq5l2fusq3bm5ufh.apps.googleusercontent.com';

// Scopes que necesitamos (solo lectura de Drive)
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly'
];

// Configuración de la app
export const APP_CONFIG = {
  appName: 'Informe PT - Proservis',
  supportEmail: 'admin@proservis.com.co',
};