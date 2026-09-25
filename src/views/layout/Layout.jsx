/**
 * Layout — Barra lateral idéntica a Siamo (barra-siamo.html) con colores Proservis
 * Animación pill + notch SVG, misma función, paleta Proservis
 */
import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { getWorkspace, getArea } from '../../models/Workspace';
import { ROLE_LABEL } from '../../models/constants';
import { LB } from '../../assets/logos';

const MENU = [
  { section: 'Principal' },
  { path: '/', label: 'Dashboard', icon: 'monitor', ac:'#168A43', roles: ['super_admin', 'admin', 'usuario'] },
  { path: '/clientes', label: 'Mis clientes', icon: 'users', ac:'#0F6B33', roles: ['usuario', 'admin', 'super_admin'] },
  { path: '/colaborativo', label: 'Tablero colaborativo', icon: 'chart', ac:'#E8BB26', roles: ['usuario', 'admin', 'super_admin'], badge: 'Atención al Cliente' },
  { path: '/mis-contribuciones', label: 'Mis contribuciones', icon: 'upload', ac:'#1A5276', roles: ['usuario', 'admin', 'super_admin'], badge: 'Área' },
  { path: '/nuevo', label: 'Nuevo informe', icon: 'file', ac:'#168A43', roles: ['usuario', 'admin', 'super_admin'] },
  { path: '/config-modulos', label: 'Configurar módulos', icon: 'box', ac:'#5A6A5A', roles: ['usuario', 'admin', 'super_admin'] },
  { section: 'Historial' },
  { path: '/guardados', label: 'Informes guardados', icon: 'bars', ac:'#12212D', roles: ['usuario', 'admin', 'super_admin'] },
  { section: 'Administración', roles: ['admin', 'super_admin'] },
  { path: '/equipo', label: 'Mi equipo', icon: 'users', ac:'#168A43', roles: ['admin', 'super_admin'] },
  { path: '/aclientes', label: 'Gestionar clientes', icon: 'box', ac:'#0F6B33', roles: ['admin', 'super_admin'] },
  { path: '/aejecutivos', label: 'Personas', icon: 'users', ac:'#5A6A5A', roles: ['admin', 'super_admin'] },
  { section: 'Super Admin', roles: ['super_admin'] },
  { path: '/espacios', label: 'Espacios y Áreas', icon: 'monitor', ac:'#12212D', roles: ['super_admin'] },
];

/** Iconos inline (mismo set que barra-siamo.html) — la clave debe coincidir
 * exactamente con `item.icon` de MENU; si no hay match cae a `monitor`. */
const ICONS = {
  monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8M12 16.5V21"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.6 5.6 0 0 1 11 0"/><path d="M16.2 5.4a3 3 0 0 1 0 5.6"/><path d="M20.6 20a5 5 0 0 0-3.8-4.8"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 3-4 3 3 5-6"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>',
  bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M8 18v-5M13 18V9M18 18v-8"/></svg>',
};

export default function Layout({ user, ejId, onLogout, onEjChange, ejs }) {
  const location = useLocation();
  const navigate = useNavigate();
  const ws = user?.workspaceId ? getWorkspace(user.workspaceId) : null;
  const area = user?.areaId ? getArea(user.areaId) : null;
  const role = user?.role || 'usuario';
  // Color de acento por rol para el badge del pie del sidebar — coincide con los
  // íconos ◆/⬢/◉ (super_admin/admin/usuario) que ya se usan más abajo.
  const roleColor = role === 'super_admin' ? '#E8BB26' : role === 'admin' ? '#1A5276' : '#168A43';
  const [collapsed, setCollapsed] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 960px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const apply = () => setNarrowViewport(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  const isCollapsed = collapsed || narrowViewport;

  // MENU vive fuera del componente (es config estática); solo se refiltra
  // por rol cuando el rol cambia, así `filteredMenu` mantiene la misma
  // referencia entre renders normales — si cambiara en cada render, el
  // efecto de animación de abajo (que la usa como dependencia) se
  // re-ejecutaría en cada render de Layout, no solo al navegar, disparando
  // temporizadores/animaciones superpuestos que peleaban por el mismo path
  // del SVG (la causa real del hueco/parpadeo en el borde de la barra).
  const filteredMenu = useMemo(() => MENU.filter(item => {
    if (item.section) {
      if (!item.roles) return true;
      return item.roles.includes(role);
    }
    return !item.roles || item.roles.includes(role);
  }), [role]);
  // Índice del item activo para la animación
  const activeIndex = (() => {
    let idx=-1;
    let count=-1;
    for (let i=0;i<filteredMenu.length;i++) {
      const it=filteredMenu[i];
      if (it.section) continue;
      count++;
      const isActive = location.pathname === it.path || (it.path !== '/' && location.pathname.startsWith(it.path));
      if (isActive) idx=count;
    }
    return idx<0?0:idx;
  })();

  // Referencias para animación pill + notch
  const barRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const pillRef = useRef(null);
  const icoRef = useRef(null);
  const itemsRef = useRef([]);
  const itemsScrollRef = useRef(null); // la lista de items ahora hace scroll interno

  // currentCyRef guarda la última posición vertical pintada (para animar
  // DESDE ahí, no desde un valor inventado) y prevIndexRef si el item activo
  // realmente cambió — antes el efecto SIEMPRE disparaba un `setTimeout` Y
  // una animación inmediata a la vez, cada uno con su propio `currentCy`
  // local, compitiendo por escribir el mismo `path` del SVG. Con
  // `filteredMenu` ya estable (useMemo arriba) este efecto solo corre al
  // navegar de verdad, y `useLayoutEffect` pinta la posición inicial antes
  // del primer paint — sin el hueco/parpadeo que se veía al cargar la página.
  const currentCyRef = useRef(null);
  const prevIndexRef = useRef(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const pill = pillRef.current;
    const ico = icoRef.current;
    if (!bar || !svg || !path || !pill) return;
    const rH = 24, DIP = 32, NOTCH = 72, R = 24;
    let raf = null;

    const W = () => bar.clientWidth;
    const H = () => bar.clientHeight;
    const getActiveEl = () => {
      const els = itemsRef.current.filter(Boolean);
      return els[activeIndex] || els[0] || null;
    };
    const centerOf = (el) => {
      if (!el) return H() / 2;
      const r = el.getBoundingClientRect();
      const a = bar.getBoundingClientRect();
      return r.top - a.top + r.height / 2;
    };
    const buildPath = (cy, w, h) => {
      const half = NOTCH / 2;
      const b = Math.min(cy + half + 18, h - R), t = Math.max(cy - half - 18, R);
      const b1 = Math.min(cy + half - 8, h - R), b2 = Math.min(cy + half - 2, h - R);
      const t1 = Math.max(cy - half + 2, R), t2 = Math.max(cy - half + 8, R);
      const xd = w - DIP;
      // Para barra izquierda, el notch es a la derecha
      return `M 0 0 L 0 ${h} L ${w-R} ${h} Q ${w} ${h} ${w} ${h-R} L ${w} ${b} C ${w} ${b1} ${xd} ${b2} ${xd} ${cy} C ${xd} ${t1} ${w} ${t2} ${w} ${t} L ${w} ${R} Q ${w} 0 ${w-R} 0 L 0 0 Z`;
    };
    const render = (cy) => {
      const w = W(), h = H();
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      path.setAttribute('d', buildPath(cy, w, h));
      pill.style.top = (cy - rH) + 'px';
      currentCyRef.current = cy;
      // La lista de items ahora hace scroll interno — si el ítem activo se
      // desplazó fuera del área visible (arriba del header o abajo del pie),
      // la píldora se desvanece en vez de quedar flotando sobre otra sección.
      const scrollEl = itemsScrollRef.current;
      if (scrollEl) {
        const listRect = scrollEl.getBoundingClientRect();
        const barRect = bar.getBoundingClientRect();
        const top = listRect.top - barRect.top, bottom = listRect.bottom - barRect.top;
        pill.style.opacity = (cy >= top - rH && cy <= bottom + rH) ? '1' : '0';
      }
    };
    const setPillWidth = () => {
      const collapsedNow = bar.getAttribute('data-collapsed') === 'true';
      pill.style.width = collapsedNow ? (rH * 2) + 'px' : (W() - 12 - (4 - rH)) + 'px';
    };
    const setIcon = () => {
      if (!ico) return;
      const key = filteredMenu.filter(x => !x.section)[activeIndex]?.icon || 'monitor';
      ico.innerHTML = ICONS[key] || ICONS.monitor;
    };
    const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2;
    const animate = (from, to) => {
      if (raf) cancelAnimationFrame(raf);
      const dur = 460, t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = ease(p), s = Math.sin(p * Math.PI);
        pill.style.transform = `translateX(${4*s}px)`;
        render(from + (to - from) * e);
        if (p < 1) raf = requestAnimationFrame(step); else pill.style.transform = '';
      };
      raf = requestAnimationFrame(step);
    };
    const layoutNow = () => {
      render(centerOf(getActiveEl()));
      setPillWidth();
    };

    const cameFromNothing = prevIndexRef.current === null;
    const indexChanged = !cameFromNothing && prevIndexRef.current !== activeIndex;
    if (indexChanged) {
      setIcon();
      animate(currentCyRef.current ?? centerOf(getActiveEl()), centerOf(getActiveEl()));
      setPillWidth();
    } else {
      layoutNow();
      setIcon();
    }
    prevIndexRef.current = activeIndex;

    const ro = new ResizeObserver(() => layoutNow());
    ro.observe(bar);
    window.addEventListener('resize', layoutNow);
    const scrollEl = itemsScrollRef.current;
    scrollEl?.addEventListener('scroll', layoutNow, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', layoutNow);
      scrollEl?.removeEventListener('scroll', layoutNow);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeIndex, filteredMenu]);

  return (
    <>
      <style>{`
        :root{ --navy:#12212D; --navy-2:#0F1A24; --blue:#168A43; --blue-1:#1DB954; --blue-2:#0F6B33; --ball:#fff; --ball-ico:#12212D; --rH:24; --w-open:238px; --w-collapsed:80px; }
        *{box-sizing:border-box}
        html,body,#root{height:100%;margin:0}
        /* Antes era una "tarjeta" centrada (max-width 1320px, margin 20px, bordes
           redondeados y sombra) que dejaba franjas vacías a los lados en cualquier
           pantalla más ancha que eso. Ahora ocupa todo el viewport, sin margen. */
        .app-shell{width:100%;height:100vh;background:#fff;overflow:hidden;display:flex;flex-direction:column}
        /* Header Proservis — Ejecutivo Premium con acento corporativo */
        .hdr{position:relative;background:linear-gradient(135deg,#0E3A1F 0%, #168A43 35%, #1A5A2E 55%, #0F2A3A 100%);color:#fff;padding:0;display:flex;align-items:stretch;gap:0;overflow:hidden;flex-shrink:0;min-height:64px;border-bottom:3px solid #E8BB26;box-shadow:0 4px 16px rgba(0,0,0,.12)}
        .hdr::before{content:"";position:absolute;left:0;top:0;bottom:0;width:56px;background:linear-gradient(180deg,#E8BB26 0%, #D4A015 100%);clip-path:polygon(0 0, 100% 0, 78% 100%, 0 100%);opacity:.95;z-index:0}
        .hdr-tl{display:none}
        .hdr-br{position:absolute;right:22%;top:50%;transform:translateY(-50%);width:240px;height:240px;background:radial-gradient(circle, rgba(255,255,255,.06) 0%, transparent 70%);border-radius:50%;pointer-events:none}
        .hdr-in{position:relative;display:flex;align-items:center;gap:16px;width:100%;z-index:1;padding:12px 18px 12px 22px}
        .hdr-logo-wrap{position:relative;background:#fff;border-radius:10px;padding:6px 10px;box-shadow:0 2px 10px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08);display:flex;align-items:center;gap:0;flex-shrink:0;transform:translateX(-2px)}
        .hdr-logo{height:32px;display:block}
        .hdr-sep{width:1px;height:38px;background:linear-gradient(180deg, transparent, rgba(255,255,255,.35), transparent);margin:0 2px}
        .hdr-t{flex:1;min-width:0}
        .hdr-t h1{font-size:15.5px;font-weight:800;margin:0;letter-spacing:.01em;line-height:1.1;display:flex;align-items:center;gap:8px}
        .hdr-t h1::before{content:"";width:3px;height:16px;background:#E8BB26;border-radius:999px;display:inline-block;flex-shrink:0}
        .hdr-t p{font-size:11px;opacity:.88;margin:3px 0 0 11px;letter-spacing:.02em;display:flex;align-items:center;gap:6px}
        .hdr-t p::before{content:"●";color:#E8BB26;font-size:8px}
        .hdr-sel{margin-left:auto;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.10);backdrop-filter:blur(8px);padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);box-shadow:0 2px 8px rgba(0,0,0,.08)}
        .hdr-sel label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#E8BB26}
        .hdr-sel select{border:none;background:transparent;color:#fff;font-size:11px;font-weight:600;outline:none;cursor:pointer}
        .hdr-sel option{color:#12212D;background:#fff}
        .hdr-chip{background:rgba(255,255,255,.12);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:10;min-width:190px;box-shadow:0 2px 10px rgba(0,0,0,.10);transition:all .2s}
        .hdr-chip:hover{background:rgba(255,255,255,.16);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.14)}
        .hdr-avatar{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#fff 0%, #F0F0F0 100%);color:#0F6B33;display:flex;align-items:center;justifyContent:center;font-weight:900;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.8);flex-shrink:0}
        .hdr-logout{background:rgba(255,255,255,.10);backdrop-filter:blur(8px);color:#fff;border:1px solid rgba(255,255,255,.18);padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;display:flex;alignItems:center;gap:6px;transition:all .2s}
        .hdr-logout:hover{background:rgba(255,255,255,.16);transform:translateY(-1px)}
        .body{display:flex;flex:1;min-height:0}
        /* Barra idéntica a Siamo pero a la izquierda y con colores Proservis.
           Antes NO era un contenedor flex-column, así que el bloque de perfil
           del pie ("margin-top:auto") no se pegaba abajo de verdad — solo
           quedaba donde cayera el flujo normal — y la lista de módulos no
           tenía scroll propio: si no cabían todos en la ventana, los de más
           abajo quedaban recortados por app-shell (overflow:hidden) sin
           forma de llegar a ellos. Ahora .bar-head/.head-sub quedan fijos
           arriba, .bar-items es la única región que hace scroll, y el pie
           queda pegado abajo de verdad.  */
        .bar{position:relative;width:var(--w-open);flex-shrink:0;z-index:2;overflow:visible;transition:width .40s cubic-bezier(.34,.02,.16,1);filter:drop-shadow(0 22px 40px rgba(8,30,70,.12));display:flex;flex-direction:column}
        .bar[data-collapsed="true"]{width:var(--w-collapsed)}
        .bar-bg{position:absolute;inset:0;width:100%;height:100%;display:block}

        /* max-width en vez de display:none: antes la palabra desaparecía de
           golpe al colapsar (sensación "tosca"); ahora se encoge y se
           desvanece junto con el ancho de la barra, a la misma velocidad. */
        .bar-toggle{position:absolute;top:18px;right:-13px;width:26px;height:26px;border-radius:50%;border:1px solid rgba(18,33,45,.08);cursor:pointer;background:#fff;color:var(--navy);display:grid;place-items:center;box-shadow:0 3px 8px rgba(8,30,70,.22),0 1px 3px rgba(0,0,0,.1);transition:background .2s,transform .15s,box-shadow .2s;z-index:5}
        .bar-toggle:hover{background:#F1F3EF;transform:scale(1.08)}
        .bar-toggle:active{transform:scale(.92)}
        .bar-toggle svg{width:14px;height:14px;transition:transform .4s cubic-bezier(.34,.02,.16,1)}
        .bar[data-collapsed="true"] .bar-toggle svg{transform:rotate(180deg)}
        .head-sub{padding:16px 18px 8px;font-size:10px;color:rgba(255,255,255,.5);letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;flex-shrink:0;max-height:36px;opacity:1;transition:max-height .3s ease,opacity .2s ease,padding .3s ease}
        .bar[data-collapsed="true"] .head-sub{max-height:0;opacity:0;padding-top:0;padding-bottom:0}
        /* Única región con scroll — .bar sigue con overflow:visible para que
           la píldora/notch pueda seguir sobresaliendo del borde derecho. */
        .bar-items{position:relative;display:flex;flex-direction:column;padding:10px 0 18px;z-index:2;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent}
        .bar-items::-webkit-scrollbar{width:6px}
        .bar-items::-webkit-scrollbar-track{background:transparent}
        .bar-items::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:999px}
        .bar-items::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28)}
        /* Encabezado de sección: en modo colapsado el texto ("ADMINISTRACIÓN"...)
           se saldría del riel de 80px, así que se convierte en una línea
           divisoria delgada en vez de recortarse a la mitad. */
        .bar-section{flex-shrink:0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.35);margin:18px 18px 7px;font-weight:600;white-space:nowrap;overflow:hidden;transition:all .25s ease}
        .bar-items > .bar-section:first-child{margin-top:4px}
        .bar[data-collapsed="true"] .bar-section{font-size:0;height:1px;margin:14px 12px 5px;background:rgba(255,255,255,.14);border-radius:1px}
        .bar-item{position:relative;display:flex;flex-shrink:0;align-items:center;height:52px;width:100%;border:0;margin:2px 0;padding:0 16px 0 0;background:none;cursor:pointer;color:rgba(255,255,255,.78);text-align:left;-webkit-tap-highlight-color:transparent;outline:none;text-decoration:none}
        .bar-item .ic{flex:0 0 60px;display:grid;place-items:center;color:rgba(255,255,255,.60);transition:opacity .16s ease,color .2s ease,transform .18s ease}
        .bar-item .ic svg{width:23px;height:23px}
        .bar-item:hover .ic{transform:scale(1.08)}
        .bar-item .lbl{font-size:14.5px;font-weight:550;white-space:nowrap;transition:opacity .16s ease,color .18s ease,flex-basis .3s ease;flex:1;overflow:hidden}
        .bar-item::before{content:"";position:absolute;inset:4px 12px 4px 8px;border-radius:14px;background:rgba(255,255,255,0);transition:background .18s}
        .bar-item:not(.is-active):hover::before{background:rgba(255,255,255,.06)}
        .bar-item:hover .ic{color:#fff}
        .bar-item:not(.is-active):hover .lbl{color:#fff}
        .bar-item.is-active .lbl{color:var(--navy);font-weight:750}
        .bar-item.is-active .ic{opacity:0}
        .bar[data-collapsed="true"] .lbl{opacity:0;pointer-events:none}
        /* Antes esto solo pasaba dentro de un @media(max-width:960px) aparte,
           así que colapsar a mano en un desktop ancho NO lo aplicaba: los
           íconos quedaban descentrados (columna de 60px + padding asimétrico
           dentro de un riel de 80px) — la causa real de "como todo salido"
           al achicar manualmente. Ahora es una sola regla para ambos casos. */
        .bar[data-collapsed="true"] .bar-item{justify-content:center;padding:0}
        .bar[data-collapsed="true"] .bar-item .lbl{flex:0 0 0;width:0}
        .bar-pill{position:absolute;right:calc((var(--rH) * -1px) + 4px);height:calc(var(--rH)*2px);border-radius:calc(var(--rH)*1px);background:var(--ball);z-index:1;box-shadow:0 10px 22px rgba(8,30,70,.30),0 2px 6px rgba(0,0,0,.12),inset 0 1px 1px rgba(255,255,255,.9);transition:width .40s cubic-bezier(.34,.02,.16,1),opacity .2s ease;will-change:top,width,transform,opacity;pointer-events:none}
        .bar-pill .ico{position:absolute;right:calc(var(--rH)*1px);top:50%;transform:translate(50%,-50%);display:grid;place-items:center;color:var(--ball-ico);transition:opacity .15s ease}
        .bar-pill .ico svg{width:23px;height:23px}
        .bar[data-collapsed="true"] .bar-pill{right:calc((var(--rH) * -1px) + 4px)}
        .bar-footer{margin-top:auto;flex-shrink:0;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:8px;position:relative;z-index:2}
        .bar-profile-row{display:flex;gap:8px;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;transition:justify-content .2s ease}
        .bar[data-collapsed="true"] .bar-profile-row{justify-content:center;padding:8px}
        .bar-profile-text{flex:1;min-width:0;transition:flex-basis .3s ease}
        .bar[data-collapsed="true"] .bar-profile-text{flex:0 0 0;width:0}
        .bar-session-info{font-size:10px;color:rgba(255,255,255,.35);line-height:1.4;padding:0 2px;max-height:60px;overflow:hidden;transition:max-height .25s ease,opacity .2s ease,margin .25s ease}
        .bar[data-collapsed="true"] .bar-session-info{max-height:0;margin:0}
        .main{flex:1;min-width:0;background:#F1F3EF;overflow-y:auto}
        .wrap{padding:20px 24px 30px}
        /* Antes esta regla ocultaba la barra por completo en pantallas muy
           angostas (<640px) sin ningún reemplazo (ni botón hamburguesa ni
           drawer) para volver a abrirla — un callejón sin salida real en
           móvil. Ahora, por debajo de 960px, narrowViewport ya colapsa la
           barra al riel de solo-íconos (80px), así que en 640px basta con
           angostarla un poco más y dejarla siempre visible y usable. */
        @media(max-width:640px){.wrap{padding:14px}}
        @media(max-width:640px){:root{--w-collapsed:64px}}
      `}</style>

      <div className="app-shell">
        <header className="hdr">
          <div className="hdr-tl"></div>
          <div className="hdr-br"></div>
          <div className="hdr-in">
            <img className="hdr-logo" src={'data:image/png;base64,' + LB} alt="Proservis" />
            <div className="hdr-sep"></div>
            <div className="hdr-t">
              <h1>Portal de Gestión — Informes de Clientes</h1>
              <p>Proservis Temporales · {ws?.nombre || 'Espacio'} {area ? '· ' + area.nombre : ''}</p>
            </div>
            <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:10}}>
              {role === 'super_admin' && (
                <div className="hdr-sel">
                  <label style={{fontSize:10, fontWeight:700}}>Suplantar:</label>
                  <select value={ejId} onChange={e => onEjChange(e.target.value)} style={{minWidth:140, border:'none', background:'transparent', color:'#fff', fontSize:11, fontWeight:600}}>
                    {(ejs || []).map(e => <option key={e.id} value={e.id} style={{color:'#12212D'}}>{e.nom} · {ROLE_LABEL[e.role]}</option>)}
                  </select>
                </div>
              )}
              <div style={{background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:'8px 12px', display:'flex', alignItems:'center', gap:10, minWidth:180}}>
                <div style={{width:34,height:34, borderRadius:8, background:'#fff', color: roleColor, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13}}>{(user?.nom||'U').slice(0,2).toUpperCase()}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{color:'#fff', fontWeight:800, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user?.nom}</div>
                  <div style={{color:'rgba(255,255,255,.75)', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user?.email}</div>
                </div>
                <span style={{background: role==='usuario'?'#E8BB26':'#fff', color: role==='usuario'?'#12212D':roleColor, padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:800}}>{ROLE_LABEL[role]}</span>
              </div>
              <button onClick={onLogout} style={{background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.3)', padding:'8px 12px', borderRadius:8, fontSize:12, cursor:'pointer'}}>⎋ Salir</button>
            </div>
          </div>
        </header>

        <div className="body">
          {/* Barra izquierda idéntica a Siamo */}
          <nav ref={barRef} className="bar" data-collapsed={isCollapsed} aria-label="Navegación" style={{background:'transparent'}}>
            <svg ref={svgRef} className="bar-bg" preserveAspectRatio="none" aria-hidden="true" style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
              <defs><linearGradient id="panel-pro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2e1f"/><stop offset="1" stopColor="#12212D"/></linearGradient></defs>
              <path ref={pathRef} d="" fill="url(#panel-pro)"/>
            </svg>

            {!narrowViewport && (
              <button className="bar-toggle" type="button" aria-label={collapsed ? 'Expandir menú' : 'Encoger menú'} title={collapsed ? 'Expandir menú' : 'Encoger menú'} onClick={()=> setCollapsed(!collapsed)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>
              </button>
            )}
            <div className="head-sub">{ws?.nombre || 'Espacio'} {area? '· '+area.nombre:''}</div>

            <div className="bar-items" ref={itemsScrollRef}>
              {filteredMenu.map((item, idx) => {
                if (item.section) {
                  if (item.roles && !item.roles.includes(role)) return null;
                  return <div key={idx} className="bar-section">{item.section}</div>;
                }
                const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                // item.icon ya es la clave real de ICONS ('monitor', 'users', 'chart'...):
                // antes había aquí una tabla que traducía símbolos viejos (⊞ ◉ ◈ ✎ ...)
                // que MENU ya no usa, así que TODO caía siempre en el 'file' por defecto
                // — por eso se veía el mismo ícono de documento repetido en cada fila.
                const ic = ICONS[item.icon] || ICONS.monitor;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    ref={el => itemsRef.current[idx] = el}
                    className={`bar-item ${active ? 'is-active' : ''}`}
                    style={{textDecoration:'none'}}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="ic" dangerouslySetInnerHTML={{__html: ic}} />
                    <span className="lbl">{item.label}</span>
                    {item.badge && !isCollapsed && <span style={{fontSize:9, background: item.badge==='Atención al Cliente'?'#E8BB26':'#1A5276', color: item.badge==='Atención al Cliente'?'#12212D':'#fff', padding:'2px 6px', borderRadius:999, fontWeight:700, marginLeft:6}} className="lbl bar-badge">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
            <div ref={pillRef} className="bar-pill" aria-hidden="true"><span ref={icoRef} className="ico"></span></div>

            <div className="bar-footer">
              <div className="bar-profile-row">
                <div style={{width:26, height:26, borderRadius:7, background: roleColor==='#E8BB26'? '#F6ECD3':'#E8F5EE', display:'grid', placeItems:'center', fontSize:12, border:`1px solid ${roleColor}`, flexShrink:0}}>{role==='super_admin'?'◆': role==='admin'?'⬢':'◉'}</div>
                <div className="lbl bar-profile-text">
                  <div style={{color:'#fff', fontSize:11, fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user?.nom}</div>
                  <div style={{color:'rgba(255,255,255,.5)', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user?.email}</div>
                </div>
              </div>
              <div className="lbl bar-session-info">
                Sesión: {user?.email?.slice(0,22)}<br/>Espacio: {ws?.nombre || '—'}<br/><span style={{color:'#E8BB26'}}>● Firebase: reportes-pt-ejecutivos</span>
              </div>
            </div>
          </nav>

          <main className="main" style={{flex:1, minWidth:0, background:'#F1F3EF', overflowY:'auto'}}>
            <div className="wrap" style={{padding:'20px 24px 30px'}}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
