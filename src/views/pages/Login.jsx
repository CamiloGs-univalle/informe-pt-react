/**
 * views/pages/Login.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Login screen. Delegates the actual authentication logic (Firebase, then
 * local/demo fallback) to `controllers/authController.js` and only handles
 * form state + rendering here.
 */
import { useState } from 'react';
import { LB } from '../../assets/logos';
import { ROLE_LABEL } from '../../models/constants';
import { loginWithEmailPassword, loginWithGoogle } from '../../controllers/authController';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setErr('');
    setLoading(true);
    const { user, error } = await loginWithGoogle();
    setLoading(false);
    if (user) { onLogin(user.id, user); return; }
    setErr(error);
  };

  const demo = [
    { role: 'super_admin', email: 'camilo.garcia@proservis.com.co', pass: 'Proservis2026', color: '#12212D', label: 'Super Admin' },
    { role: 'admin', email: 'jefe.seleccion@proservis.com.co', pass: 'Proservis2026', color: '#168A43', label: 'Administrador' },
    { role: 'usuario', email: 'usuario.seleccion@proservis.com.co', pass: 'Proservis2026', color: '#E8BB26', label: 'Usuario' },
  ];

  const fillDemo = async (d) => {
    setEmail(d.email);
    setPassword(d.pass);
    setErr('');
    // Auto-login al hacer clic para que abra la demo de una vez
    setLoading(true);
    const { user, error } = await loginWithEmailPassword(d.email, d.pass);
    setLoading(false);
    if (user) { onLogin(user.id, user); return; }
    // Si falla (ej: Firebase no configurado), deja los campos llenos para que el usuario pulse Iniciar sesión
    if (error) setErr(error + ' — pulse Iniciar sesión para intentar de nuevo');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const { user, error } = await loginWithEmailPassword(email, password);
    setLoading(false);
    if (user) { onLogin(user.id, user); return; }
    setErr(error);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', background: 'var(--gr)' }}>
      {/* Izquierda - Branding */}
      <div style={{ background: 'linear-gradient(135deg,#168A43 0%, #0F6B33 45%, #12212D 100%)', color: '#fff', display: 'flex', flexDirection: 'column', padding: '32px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, left: -40, width: 180, height: 180, background: 'rgba(232,187,38,.18)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -30, right: -30, width: 220, height: 220, background: 'rgba(255,255,255,.06)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <img src={'data:image/png;base64,' + LB} alt="Proservis" style={{ height: 42, background: '#fff', borderRadius: 8, padding: '6px 10px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: .04 + 'em' }}>PROSERVIS</div>
              <div style={{ fontSize: 10, opacity: .75, letterSpacing: .12 + 'em' }}>TEMPORALES SAS</div>
            </div>
            <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>INFORME PT</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, marginBottom: 12 }}>Portal de Gestión<br/><span style={{ color: '#E8BB26' }}>Informes Ejecutivos</span></h1>
          <p style={{ fontSize: 13, opacity: .88, lineHeight: 1.6, maxWidth: 460 }}>Inicia sesión con tu correo corporativo. El sistema reconoce tu rol automáticamente y te lleva a tu espacio de trabajo.</p>

          <div style={{ marginTop: 28, display: 'grid', gap: 10 }}>
            {[
              { t: 'Super Admin', d: 'Crea espacios y áreas. Control total del sistema.', icon: '◆', col: '#E8BB26' },
              { t: 'Administrador', d: 'Crea personas, asigna clientes (muchos→uno) y ve el avance mensual del equipo.', icon: '⬢', col: '#fff' },
              { t: 'Usuario', d: 'Configura los módulos de tu informe. La próxima vez ya queda guardado.', icon: '◉', col: '#E8BB26' },
            ].map(x => (
              <div key={x.t} style={{ display: 'flex', gap: 12, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(6px)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: x.col === ' #fff' ? '#fff' : 'rgba(232,187,38,.2)', color: x.col === '#fff' ? '#168A43' : '#E8BB26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{x.icon}</div>
                <div><div style={{ fontSize: 12, fontWeight: 800 }}>{x.t}</div><div style={{ fontSize: 11, opacity: .78, marginTop: 2, lineHeight: 1.4 }}>{x.d}</div></div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(232,187,38,.22)', color: '#E8BB26', padding: '6px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, border: '1px solid rgba(232,187,38,.35)' }}>✦ Firebase Auth habilitado</span>
            <span style={{ background: 'rgba(255,255,255,.08)', padding: '6px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, border: '1px solid rgba(255,255,255,.15)' }}>reportes-pt-ejecutivos</span>
          </div>
        </div>
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 2, fontSize: 10, opacity: .6, paddingTop: 18 }}>© Proservis Temporales · Informe PT · v3 · Hecho para el Señor Camilo</div>
      </div>

      {/* Derecha - Form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,.10)', border: '1px solid #E6EBE6' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#12212D' }}>Bienvenido Señor</div>
            <div style={{ fontSize: 11, color: '#5A6A5A', marginTop: 4 }}>Ingresa con tu correo corporativo</div>
          </div>

          <label className="flabel">Correo corporativo *</label>
          <input className="finput" type="email" placeholder="nombre@proservis.co" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" style={{ marginBottom: 12 }} />

          <label className="flabel">Contraseña *</label>
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <input className="finput" type={show ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ paddingRight: 42 }} />
            <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 6, top: 6, background: 'var(--gr)', border: '1px solid var(--grb)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--grt)' }}>{show ? 'Ocultar' : 'Ver'}</button>
          </div>
          <div style={{ fontSize: 10, color: '#5A6A5A', marginBottom: 10 }}>Demo: contraseña <strong>Proservis2026</strong></div>

          {err && <div className="alrt aro" style={{ marginBottom: 12, fontSize: 12 }}>{err}</div>}

          <button type="submit" className="btn bvd" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '11px 18px', fontSize: 14, opacity: loading ? .7 : 1 }}>
            {loading ? 'Ingresando…' : 'Iniciar sesión →'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--grb)' }} />
            <span style={{ fontSize: 10, color: '#5A6A5A', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .06 + 'em' }}>O CON GOOGLE</span>
            <div style={{ flex: 1, height: 1, background: 'var(--grb)' }} />
          </div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn bgh" style={{ width: '100%', justifyContent: 'center', padding: '11px 18px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, opacity: loading ? .7 : 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {loading ? 'Conectando con Google…' : 'Iniciar sesión con Google'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 10, color: '#5A6A5A' }}>¿Olvidaste tu clave? Contacta al Super Admin para restablecerla.</div>

          <div style={{ marginTop: 18, borderTop: '1px solid var(--grb)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#168A43', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .06 + 'em' }}>Accesos demo — clic para autocompletar</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {demo.map(d => (
                <button key={d.email} type="button" onClick={() => fillDemo(d)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: '#fff', border: '1px solid var(--grb)', borderLeft: `4px solid ${d.color}`, borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: d.color, color: d.color === '#E8BB26' ? '#12212D' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{d.label[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#12212D' }}>{d.label} <span style={{ fontSize: 10, color: '#5A6A5A', fontWeight: 600 }}>· {ROLE_LABEL[d.role]}</span></div>
                    <div style={{ fontSize: 11, color: '#5A6A5A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.email} · {d.pass}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#168A43', fontWeight: 700 }}>Usar →</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, background: 'var(--vc)', border: '1px solid #C8E6D4', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#0F6B33', lineHeight: 1.5 }}>
            <strong>Tip Señor:</strong> Si usa Firebase real, cree los usuarios en <em>Authentication → Users</em> con estos correos. Si no, el login local funciona sin configurar nada.
          </div>
        </form>
      </div>
    </div>
  );
}
