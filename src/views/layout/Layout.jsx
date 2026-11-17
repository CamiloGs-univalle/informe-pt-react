/**
 * views/layout/Layout.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Marco de la aplicación: cabecera corporativa, menú lateral y área de
 * contenido. El menú se arma según lo que cada persona puede hacer
 * (`models/Alcance.js: capacidades`), no solo según su rol, y cada entrada
 * lleva a una pantalla que existe y tiene datos para esa persona.
 *
 * Estilos: `assets/styles/app.css`.
 */
import { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { getWorkspace, getArea } from '../../models/Workspace';
import { ROLE_LABEL } from '../../models/constants';
import { capacidades } from '../../models/Alcance';
import { loadState } from '../../models/db';
import { iniciales } from '../../utils/format';
import { LogoProservis } from '../common/LogoProservis';

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.6 5.6 0 0 1 11 0"/><path d="M16.2 5.4a3 3 0 0 1 0 5.6"/><path d="M20.6 20a5 5 0 0 0-3.8-4.8"/></svg>',
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/></svg>',
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.5" r="3"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="4.5" cy="10" r="2"/><circle cx="19.5" cy="10" r="2"/></svg>',
  building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 15 5v16"/><path d="M15 9h3.5A1.5 1.5 0 0 1 20 10.5V21"/><path d="M3 21h18M8 8h3M8 12h3M8 16h3"/></svg>',
  id: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16.5a3.6 3.6 0 0 1 7 0M14.5 10h4M14.5 13.5h3"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.4v.1"/></svg>',
};

/** `cap` es la clave de `capacidades()` que habilita la entrada. */
const MENU = [
  { section: 'Mi trabajo' },
  { path: '/', label: 'Inicio', icon: 'home', cap: 'dashboard', end: true },
  { path: '/mis-contribuciones', label: 'Mis aportes', icon: 'upload', cap: 'contribuciones' },
  { path: '/colaborativo', label: 'Tablero del equipo', icon: 'board', cap: 'colaborativo' },
  { path: '/clientes', label: 'Mis clientes', icon: 'users', cap: 'clientes' },
  { section: 'Informes' },
  { path: '/nuevo', label: 'Nuevo informe', icon: 'file', cap: 'nuevo' },
  { path: '/guardados', label: 'Informes guardados', icon: 'archive', cap: 'guardados' },
  { path: '/config-modulos', label: 'Mis módulos', icon: 'sliders', cap: 'config' },
  { section: 'Administración' },
  { path: '/equipo', label: 'Mi equipo', icon: 'team', cap: 'equipo' },
  { path: '/aclientes', label: 'Gestionar clientes', icon: 'building', cap: 'aclientes' },
  { path: '/aejecutivos', label: 'Personas', icon: 'id', cap: 'aejecutivos' },
  { section: 'Super Admin' },
  { path: '/espacios', label: 'Espacios y áreas', icon: 'layers', cap: 'espacios' },
  { path: '/admin-data', label: 'Datos y cargas', icon: 'alert', cap: 'admindata', danger: true },
];

/** Quita las secciones que quedaron sin entradas. */
function visibleMenu(caps) {
  const out = [];
  MENU.forEach(item => {
    if (item.section) { out.push(item); return; }
    if (caps[item.cap]) out.push(item);
  });
  return out.filter((it, i) => !it.section || (out[i + 1] && !out[i + 1].section));
}

const GRUPO_ROL = { super_admin: 'Super administradores', admin: 'Administradores', usuario: 'Usuarios' };

export default function Layout({ user, realUser, ejs, onLogout, onViewAs }) {
  const location = useLocation();
  const role = user?.role || 'usuario';
  const ws = user?.workspaceId ? getWorkspace(user.workspaceId) : null;
  const area = user?.areaId ? getArea(user.areaId) : null;
  const viendoComo = realUser && user && realUser.id !== user.id;
  const puedeVerComo = realUser?.role === 'super_admin';
  const caps = useMemo(() => capacidades(user), [user]);
  const menu = useMemo(() => visibleMenu(caps), [caps]);

  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 960px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const apply = () => { setNarrow(mq.matches); if (!mq.matches) setDrawer(false); };
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  const isCollapsed = collapsed && !narrow;
  const offline = loadState.source === 'cache' || loadState.source === 'vacio';
  const contexto = [ws?.nombre, area?.nombre].filter(Boolean).join(' · ');
  const personasParaVer = [...(ejs || [])].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'es'));

  return (
    <div className={'app-shell' + (puedeVerComo ? ' has-viewas' : '')}>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="hdr">
        <div className="hdr-in">
          <button type="button" className="hdr-menu" aria-label="Abrir menú" aria-expanded={drawer} onClick={() => setDrawer(d => !d)}>☰</button>
          <div className="hdr-logo"><LogoProservis height={30} /></div>
          <div className="hdr-sep" />
          <div className="hdr-t">
            <h1>Portal de informes de clientes</h1>
            {contexto && <p>{contexto}</p>}
          </div>
          <div className="hdr-right">
            {puedeVerComo && (
              <div className="hdr-viewas">
                <label htmlFor="ver-como">Ver como</label>
                <select id="ver-como" value={user.id} onChange={e => onViewAs(e.target.value)}>
                  {['super_admin', 'admin', 'usuario'].map(rol => {
                    const grupo = personasParaVer.filter(e => (e.role || 'usuario') === rol);
                    if (!grupo.length) return null;
                    return (
                      <optgroup key={rol} label={GRUPO_ROL[rol]}>
                        {grupo.map(e => (
                          <option key={e.id} value={e.id}>{e.nom}{e.id === realUser.id ? ' (yo)' : ''}{e.activo === false ? ' · inactiva' : ''}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
            )}
            <div className="hdr-chip">
              <div className="hdr-avatar" aria-hidden="true">{iniciales(user?.nom)}</div>
              <div className="hdr-chip-txt">
                <div className="hdr-chip-name">{user?.nom} <span className={'role-pill ' + role}>{ROLE_LABEL[role]}</span></div>
                <div className="hdr-chip-mail" title={user?.email}>{user?.email}</div>
              </div>
            </div>
            <button type="button" className="hdr-out" onClick={onLogout} aria-label="Cerrar sesión"><span className="hdr-out-long">Cerrar sesión</span><span className="hdr-out-short">Salir</span></button>
          </div>
        </div>
      </header>

      {viendoComo && (
        <div className="ctx-banner viewas" role="status">
          <span>Estás viendo la plataforma como <strong>{user.nom}</strong> ({ROLE_LABEL[user.role]}). Lo que hagas queda a su nombre.</span>
          <button type="button" className="btn bam bsm" onClick={() => onViewAs('')}>Volver a mi cuenta</button>
        </div>
      )}
      {offline && (
        <div className="ctx-banner offline" role="alert">
          <span><strong>Sin conexión con el servidor.</strong> Estás viendo una copia guardada en este equipo; los cambios que hagas no se guardarán en la nube.</span>
          <button type="button" className="btn bvd bsm" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      )}

      <div className="app-body">
        {narrow && drawer && <div className="bar-scrim" onClick={() => setDrawer(false)} />}
        <nav className={'bar' + (drawer ? ' open' : '')} data-collapsed={isCollapsed} aria-label="Navegación principal">
          {!narrow && (
            <button type="button" className="bar-toggle" aria-label={collapsed ? 'Expandir menú' : 'Encoger menú'} title={collapsed ? 'Expandir menú' : 'Encoger menú'} onClick={() => setCollapsed(c => !c)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          )}
          <div className="bar-ctx">
            <div className="bar-ctx-ws">{ws?.nombre || 'Proservis'}</div>
            {area && <div className="bar-ctx-area">{area.nombre}</div>}
          </div>
          <div className="bar-items">
            {menu.map((item, i) => item.section
              ? <div key={'s' + i} className="bar-section">{item.section}</div>
              : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => 'bar-item' + (isActive ? ' is-active' : '') + (item.danger ? ' danger' : '')}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="ic" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[item.icon] }} />
                  <span className="lbl">{item.label}</span>
                </NavLink>
              ))}
          </div>
          <div className="bar-footer">
            <div className={'bar-status' + (offline ? ' off' : '')} title={offline ? 'Sin conexión con el servidor' : 'Conectado al servidor'}>
              <i /><span>{offline ? 'Sin conexión' : 'Datos al día'}</span>
            </div>
          </div>
        </nav>

        <main className="main" id="contenido" tabIndex={-1}>
          <div className="wrap">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
