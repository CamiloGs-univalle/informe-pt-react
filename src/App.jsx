/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Raíz de la aplicación. Orquesta la sesión en este orden:
 *
 *   1. Firebase Auth informa si hay una sesión (se restaura sola al recargar).
 *   2. Con sesión → se cargan los datos desde Firestore (ya autenticados).
 *   3. Se busca el perfil de la persona por correo (rol, área, clientes…).
 *      Si no está registrada o está inactiva, se cierra la sesión y se avisa.
 *   4. El super admin puede "ver como" otra persona sin perder su propia
 *      sesión (`viewAs`) y volver con un clic.
 */
import './assets/styles/global.css';
import './assets/styles/app.css';
import { HashRouter } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { loadDB, resetDB } from './models/db';
import { getEjs, getUserByEmail, getEj } from './models/Ejecutivo';
import { logout } from './controllers/authController';
import { ViewAsContext } from './views/common/ViewAs';
import { UIProvider } from './views/common/UIProvider';
import Splash from './views/common/Splash';
import Login from './views/pages/Login';
import AppRoutes from './routes/AppRoutes';

const VIEW_AS_KEY = 'ps_view_as';

function readViewAs() {
  try { return sessionStorage.getItem(VIEW_AS_KEY) || ''; } catch { return ''; }
}
function writeViewAs(id) {
  try { if (id) sessionStorage.setItem(VIEW_AS_KEY, id); else sessionStorage.removeItem(VIEW_AS_KEY); } catch { /* sin almacenamiento */ }
}

export default function App() {
  // status: 'boot' (esperando a Firebase) | 'out' | 'loading' | 'in'
  const [status, setStatus] = useState('boot');
  const [realUserId, setRealUserId] = useState('');
  const [viewAsId, setViewAsId] = useState(readViewAs);
  const [authError, setAuthError] = useState('');
  const [version, setVersion] = useState(0); // fuerza re-render tras recargar datos

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return;
      if (!fbUser) {
        resetDB();
        setRealUserId('');
        setStatus('out');
        return;
      }
      setStatus('loading');
      const cargo = await loadDB({ force: true });
      if (cancelled) return;
      const perfil = getUserByEmail(fbUser.email);
      if (!perfil) {
        setAuthError(cargo
          ? `La cuenta ${fbUser.email} no está registrada en la plataforma. Pide al administrador que te agregue con este correo.`
          : `La contraseña es correcta, pero no se pudieron leer los datos de la plataforma (revisa la conexión o las reglas de Firestore). Cuenta: ${fbUser.email}.`);
        await logout();
        return;
      }
      if (perfil.activo === false) {
        setAuthError('Tu usuario está desactivado. Contacta al administrador.');
        await logout();
        return;
      }
      setAuthError('');
      setRealUserId(perfil.id);
      setStatus('in');
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  const realUser = status === 'in' ? getEj(realUserId) : null;
  const esSuper = realUser?.role === 'super_admin';

  // La persona "efectiva": quien aparece en pantalla (la real o aquella a la que el super admin está viendo).
  const user = useMemo(() => {
    if (!realUser) return null;
    if (esSuper && viewAsId && viewAsId !== realUser.id) return getEj(viewAsId) || realUser;
    return realUser;
    // `version` fuerza a recalcular cuando se editan personas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realUser, esSuper, viewAsId, version]);

  const handleViewAs = useCallback((id) => {
    const next = id && id !== realUserId ? id : '';
    writeViewAs(next);
    setViewAsId(next);
    setVersion(v => v + 1);
  }, [realUserId]);

  const handleLogout = useCallback(async () => {
    writeViewAs('');
    setViewAsId('');
    await logout();
  }, []);

  if (status === 'boot') return <Splash text="Iniciando…" />;
  if (status === 'loading') return <Splash text="Cargando tus datos…" />;

  if (status === 'out' || !user) {
    return (
      <UIProvider>
        <Login externalError={authError} onClearError={() => setAuthError('')} />
      </UIProvider>
    );
  }

  // Entrar como otra persona y empezar en su pantalla de inicio.
  const verComo = (id) => { handleViewAs(id); window.location.hash = '#/'; };

  return (
    <UIProvider>
      <ViewAsContext.Provider value={{ puede: esSuper, verComo }}>
      <HashRouter>
        <AppRoutes
          user={user}
          realUser={realUser}
          ejs={getEjs()}
          onLogout={handleLogout}
          onViewAs={handleViewAs}
        />
      </HashRouter>
      </ViewAsContext.Provider>
    </UIProvider>
  );
}
