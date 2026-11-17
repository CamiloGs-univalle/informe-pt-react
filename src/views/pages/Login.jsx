/**
 * views/pages/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla de acceso. Solo recoge credenciales y llama a
 * `controllers/authController.js`; cuando Firebase confirma la sesión,
 * `App.jsx` detecta el cambio, carga los datos y entra a la plataforma.
 * No hay cuentas de ejemplo ni contraseñas visibles.
 */
import { useState } from 'react';
import { loginWithEmailPassword, loginWithGoogle } from '../../controllers/authController';
import { LogoProservis } from '../common/LogoProservis';

const ROLES_INFO = [
  { t: 'Ejecutivo', d: 'Lidera el informe final de sus clientes: valida los aportes del equipo y lo publica.', c: 'am' },
  { t: 'Equipo de área', d: 'Selección, SST, Bienestar y otras áreas suben su parte del informe cada mes.', c: 'w' },
  { t: 'Administrador', d: 'Organiza personas y clientes de su equipo y sigue el avance mensual.', c: 'w' },
];

export default function Login({ externalError, onClearError }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const error = err || externalError;

  const run = async (fn) => {
    setErr('');
    onClearError?.();
    setLoading(true);
    const res = await fn();
    // Si salió bien, App.jsx toma el control (carga datos y cambia de pantalla).
    if (res?.error) { setErr(res.error); setLoading(false); }
  };

  const submit = (e) => { e.preventDefault(); run(() => loginWithEmailPassword(email, password)); };

  return (
    <div className="login">
      <section className="login-brand" aria-hidden="false">
        <div className="login-brand-in">
          <div className="login-logo"><LogoProservis height={38} /></div>
          <h1>Informes mensuales<br /><span>para cada cliente</span></h1>
          <p>Cada área aporta su parte, el ejecutivo la valida y el cliente recibe un informe claro, completo y a tiempo.</p>
          <ul className="login-roles">
            {ROLES_INFO.map(r => (
              <li key={r.t}>
                <strong>{r.t}</strong>
                <span>{r.d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="login-foot">© Proservis Temporales</div>
      </section>

      <section className="login-form-wrap">
        <form onSubmit={submit} className="login-card" noValidate>
          <div className="login-card-logo"><LogoProservis height={34} /></div>
          <h2>Ingresa a tu cuenta</h2>
          <p className="login-lead">Usa tu correo corporativo de Proservis.</p>

          <label className="flabel" htmlFor="lg-mail">Correo electrónico</label>
          <input id="lg-mail" className="finput" type="email" inputMode="email" placeholder="nombre@proservis.com.co" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoFocus />

          <label className="flabel" htmlFor="lg-pass">Contraseña</label>
          <div className="login-pass">
            <input id="lg-pass" className="finput" type={show ? 'text' : 'password'} placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            <button type="button" className="login-eye" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? 'Ocultar' : 'Mostrar'}</button>
          </div>

          {error && <div className="alrt aro login-err" role="alert">{error}</div>}

          <button type="submit" className="btn bvd login-btn" disabled={loading}>{loading ? 'Ingresando…' : 'Iniciar sesión'}</button>

          <div className="login-or"><span>o</span></div>

          <button type="button" className="btn bgh login-btn" disabled={loading} onClick={() => run(loginWithGoogle)}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continuar con Google
          </button>

          <p className="login-help">¿No puedes entrar o olvidaste tu contraseña? Escríbele a tu administrador para que revise tu acceso.</p>
        </form>
      </section>
    </div>
  );
}
