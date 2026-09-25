/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Orchestrates the login flow: tries Firebase Authentication first, then
 * falls back to the local/demo authentication kept in the Ejecutivo model.
 * This is the "Controller" in the MVC sense for the Login view — it is the
 * only place that knows *how* login is resolved, so the view only has to
 * render the form and react to `{ user }` / `{ error }`.
 *
 * Behaviour mirrors exactly what was previously inlined in
 * `components/Login.jsx`, just extracted so it can be reused/tested and so
 * the view stays focused on rendering.
 */
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { authenticateLocal, getUserByEmail } from '../models/Ejecutivo';

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
    const local = authenticateLocal(em, pw);
    if (local) return { user: local };

    const code = fbErr?.code || '';
    if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
      return { error: 'Correo o contraseña incorrectos. Verifica o usa una cuenta demo.' };
    }
    if (code.includes('too-many-requests')) {
      return { error: 'Demasiados intentos. Intenta en unos minutos Señor.' };
    }
    return {
      error: getUserByEmail(em)
        ? 'Revisa tu contraseña. Pista demo: Proservis2026'
        : 'Usuario no encontrado. Usa una cuenta demo abajo.',
    };
  }
}
