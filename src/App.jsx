/**
 * App.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Composition root: bootstraps the local "database", listens for Firebase
 * auth state, and renders either the Login view or the authenticated
 * route tree (`routes/AppRoutes.jsx`). Session/role switching logic lives
 * here because it is cross-cutting (needed by Login, Layout and the route
 * guards alike) rather than belonging to any single page.
 */
import './assets/styles/global.css';
import { HashRouter } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { loadDB } from './models/db';
import { getEjs, getCurrentUser, setCurrentUser, clearCurrentUser } from './models/Ejecutivo';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase';
import { ToastProvider } from './views/common/Toast';
import Login from './views/pages/Login';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [ejs, setEjs] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadDB().then(() => {
      if (mounted) {
        setEjs(getEjs());
        setDbReady(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Firebase auth listener (opcional, no bloquea). Se suscribe una sola vez;
  // usa la forma funcional de setUser (en vez de leer `user` del closure)
  // para evitar vincular una sesión de Firebase por encima de una sesión
  // local que ya haya iniciado después del montaje.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) return;
      setUser((prevUser) => {
        if (prevUser) return prevUser;
        // si hay sesión Firebase pero no local, intentar vincular
        const local = getEjs().find(u => (u.email || '').toLowerCase() === (fbUser.email || '').toLowerCase());
        if (!local) return prevUser;
        setCurrentUser(local);
        return local;
      });
    });
    return () => unsub && unsub();
  }, []);

  const handleLogin = (id, userObj) => {
    const u = userObj || getEjs().find(x => x.id === id) || getCurrentUser();
    if (!u) return;
    setCurrentUser(u);
    setUser(u);
    setEjs(getEjs());
  };

  const handleLogout = async () => {
    try { await auth.signOut(); } catch (e) { /* already signed out / offline */ }
    clearCurrentUser();
    setUser(null);
  };

  const handleEjChange = (id) => {
    // solo super_admin puede suplantar
    if (user?.role !== 'super_admin') return;
    const target = getEjs().find(x => x.id === id);
    if (target) { setCurrentUser(target); setUser(target); }
  };

  if (!dbReady) {
    return (
      <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#F1F3EF'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:24,marginBottom:16,color:'#168A43'}}>⚙️</div>
          <div style={{fontSize:16,color:'#12212D'}}>Cargando datos desde Firebase...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Login onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <HashRouter>
        <AppRoutes user={user} ejId={user.id} ejs={ejs} onLogout={handleLogout} onEjChange={handleEjChange} />
      </HashRouter>
    </ToastProvider>
  );
}