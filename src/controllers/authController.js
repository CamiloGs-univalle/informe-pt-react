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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

/**
 * Attempts to authenticate a user with Google Sign-In.
 * Links to local user by email if exists, otherwise creates minimal profile.
 *
 * @returns {Promise<{ user?: object, error?: string }>}
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    // Forzar selección de cuenta (útil si hay múltiples sesiones de Google)
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const cred = await signInWithPopup(auth, provider);
    const em = (cred.user.email || '').toLowerCase();
    
    if (!em) {
      return { error: 'No se pudo obtener el email de la cuenta Google.' };
    }

    // Enrich with local role/profile if exists
    const local = getUserByEmail(em);
    const user = local
      ? { ...local, firebaseUid: cred.user.uid, email: cred.user.email, photoURL: cred.user.photoURL }
      : { 
          id: cred.user.uid, 
          nom: cred.user.displayName || cred.user.email.split('@')[0], 
          email: cred.user.email, 
          role: 'usuario', 
          workspaceId: 'w1', 
          areaId: 'a1',
          photoURL: cred.user.photoURL
        };
    
    console.log('[AUTH] Google login exitoso:', em, user.role);
    return { user };
  } catch (fbErr) {
    const code = fbErr?.code || '';
    console.error('[AUTH] Google login falló:', code, fbErr?.message);
    
    if (code.includes('popup-closed-by-user')) {
      return { error: 'Ventana de Google cerrada. Intenta de nuevo.' };
    }
    if (code.includes('auth/cancelled-popup-request')) {
      return { error: 'Solicitud cancelada. Intenta de nuevo.' };
    }
    if (code.includes('network-request-failed') || code.includes('auth/internal-error')) {
      return { error: 'Error de conexión con Google. Verifica tu internet.' };
    }
    if (code.includes('auth/account-exists-with-different-credential')) {
      return { error: 'Esta cuenta ya existe con otro método de acceso. Usa email/contraseña.' };
    }
    return { error: 'No se pudo iniciar sesión con Google. ' + (fbErr?.message || 'Error desconocido') };
  }
}

/**
 * Sign out from Firebase Auth.
 */
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('[AUTH] Logout falló:', error);
    return { error: error.message };
  }
}
