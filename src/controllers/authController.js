/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Orchestrates the login flow. Firebase Authentication is the single source
 * of truth for credentials — every real user must exist there (see
 * scripts/migrate-to-firestore.mjs). The local/offline fallback below is
 * intentionally narrow: it only engages when Firebase itself could not be
 * reached (no network / Firebase outage), never as a silent substitute for
 * "this user/password doesn't exist in Firebase". That distinction matters:
 * treating a wrong password or an unmigrated account as if it were an
 * offline event used to let logins silently succeed against local mock data
 * while Firestore stayed completely empty — which is exactly the bug this
 * fixes. Any use of the fallback is logged loudly so it's never invisible.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authenticateLocal, getUserByEmail } from '../models/Ejecutivo';

// Firebase error codes that indicate Firebase itself is unreachable, as
// opposed to the credentials being wrong. Only these justify the offline
// fallback.
const CONNECTIVITY_ERROR_CODES = [
  'auth/network-request-failed',
  'auth/internal-error',
  'auth/timeout',
];

/**
 * Attempts to authenticate a user with email + password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user?: object, error?: string }>}
 */
export async function loginWithEmailPassword(email, password) {
  const em = (email || '').trim().toLowerCase();
  const pw = (password || '').trim();

  if (!em || !pw) return { error: 'Ingresa correo y contraseña Señor.' };
  if (!em.includes('@')) return { error: 'Correo no válido.' };

  try {
    const cred = await signInWithEmailAndPassword(auth, em, pw);
    // Firebase authenticated the user; enrich with the local role/profile
    // if we have one on file, otherwise fall back to a minimal "usuario".
    const local = getUserByEmail(em);
    const user = local
      ? { ...local, firebaseUid: cred.user.uid, email: cred.user.email }
      : { id: cred.user.uid, nom: cred.user.email.split('@')[0], email: cred.user.email, role: 'usuario', workspaceId: 'w1', areaId: 'a1' };
    return { user };
  } catch (fbErr) {
    const code = fbErr?.code || '';

    if (CONNECTIVITY_ERROR_CODES.some(c => code.includes(c))) {
      console.warn(`[AUTH] Firebase inalcanzable (${code}) — usando sesión local sin conexión para ${em}.`);
      const local = authenticateLocal(em, pw);
      if (local) return { user: { ...local, _offline: true } };
      return { error: 'No hay conexión con Firebase y no hay una sesión local para este correo.' };
    }

    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
      return { error: 'Correo o contraseña incorrectos. Verifica o usa una cuenta demo.' };
    }
    if (code.includes('too-many-requests')) {
      return { error: 'Demasiados intentos. Intenta en unos minutos Señor.' };
    }
    console.error('[AUTH] Firebase rechazó el login por un motivo no manejado:', code, fbErr?.message);
    return {
      error: getUserByEmail(em)
        ? 'Revisa tu contraseña. Pista demo: Proservis2026'
        : 'Usuario no encontrado. Usa una cuenta demo abajo.',
    };
  }
}
