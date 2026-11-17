/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Inicio y cierre de sesión. Firebase Authentication es la ÚNICA fuente de
 * credenciales: no hay contraseñas guardadas en la base de datos ni cuentas
 * "de prueba". Este controlador solo autentica; qué rol y qué datos tiene la
 * persona lo resuelve `App.jsx` después, cargando Firestore ya autenticado y
 * buscando su perfil por correo (`models/Ejecutivo.js: getUserByEmail`).
 */
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const MENSAJES = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Contacta al administrador.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de Google antes de terminar.',
  'auth/cancelled-popup-request': 'Se canceló el inicio de sesión. Inténtalo de nuevo.',
  'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio.',
  'auth/account-exists-with-different-credential': 'Este correo ya tiene otro método de acceso. Entra con correo y contraseña.',
};

function mensajeDe(err) {
  const code = err?.code || '';
  return MENSAJES[code] || 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

/** Inicia sesión con correo y contraseña. @returns {Promise<{ok?: true, error?: string}>} */
export async function loginWithEmailPassword(email, password) {
  const em = (email || '').trim().toLowerCase();
  const pw = password || '';
  if (!em || !pw) return { error: 'Escribe tu correo y tu contraseña.' };
  if (!/^\S+@\S+\.\S+$/.test(em)) return { error: 'El correo no es válido.' };
  try {
    await signInWithEmailAndPassword(auth, em, pw);
    return { ok: true };
  } catch (err) {
    console.error('[AUTH] login falló:', err?.code);
    return { error: mensajeDe(err) };
  }
}

/** Inicia sesión con Google (el correo debe coincidir con una persona registrada). */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
    return { ok: true };
  } catch (err) {
    console.error('[AUTH] google falló:', err?.code);
    return { error: mensajeDe(err) };
  }
}

/** Cierra la sesión de Firebase. */
export async function logout() {
  try { await signOut(auth); } catch (err) { console.error('[AUTH] logout falló:', err); }
}
