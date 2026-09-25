# CLAUDE — Guía para el grupo de desarrolladores · Informe PT

Este archivo es leído por Claude Code / OpenCode al iniciar sesión. Define cómo trabajar en este repo sin romper la arquitectura.

## Stack
- React 19 + Vite, HashRouter, Firebase Auth (reportes-pt-ejecutivos), xlsx, html2pdf.js, localStorage como DB.
- Sin backend. Toda persistencia en `src/models/db.js` → `localStorage["ps_v3"]`.

## Arquitectura (ver `docs/ARCHITECTURE.md`)
```
src/models      → dominio puro (sin React). Lee/escribe DB.*
src/controllers  → orquesta modelos+servicios (auth, reporting, informe)
src/services     → integraciones externas (Drive, Excel, PDF, HTML report)
src/views        → React (pages / layout / common)
src/routes       → AppRoutes + RequireRole
src/config       → firebase + app.config (env VITE_*)
```
**Regla de dependencias:** views → controllers → models/services. Nunca al revés.

## Roles & Jerarquía (ver `docs/MODEL.md`)
- `super_admin` → crea Espacios (`Workspace`) y Áreas. Ve todo. Puede suplantar.
- `admin` → crea personas (`Ejecutivo`), asigna clientes (muchos→uno), ve seguimiento mensual de su equipo (mismo workspace).
- `usuario` → configura módulos (global + por cliente) y genera informes. Historial propio.

**Enforcement:**
- Rutas protegidas con `RequireRole` (`src/routes/RequireRole.jsx`).
- `src/models/Ejecutivo.js: saveEj(data, actor)` valida que solo super_admin cree super_admin.
- `EquipoAdmin` solo ofrece `super_admin` si actor es super_admin.
- No permitir auto-eliminación.

## Módulos de informe (13)
Catálogo en `src/models/constants.js: MODULOS`:
`headcount, seleccion, rotacion, sst, sst_tasa, sst_severidad, sst_investigacion, nomina, ausentismo, capacitacion, clima, facturacion, fotos`
- Activa/desactiva en `ConfigModulos` (global y por cliente) → `src/models/ModuloConfig.js`.
- Pasos del wizard filtrados en `src/views/pages/nuevo-informe/steps.js` (`STEP_TO_MODULO`).
- HTML final en `src/services/htmlReport.service.js: buildInformeHTML(d, rqs, motivos, casos, fotos, extras)` — **personalizado**: si un módulo está desactivado, su tab y sección no se renderizan. `extras = { activeModules, ausentismo, capacitacion, clima, facturacion }`.

## Informe HTML (calidad ejecutiva)
- Diseño premium en `htmlReport.service.js` (CSS inline, gradientes, semáforos verde/amarillo/rojo, insights, print styles).
- Cover con nota de personalización, nav sticky, 6-10 KPIs en resumen filtrados por módulos activos.
- Cada módulo tiene KPIs + tablas + barras + insight (ej. selección <80% → alerta).
- `src/controllers/informeController.js` arma `d` y delega a `buildInformeHTML`.

## Historial con calificación
- `src/models/Informe.js: updateInfRating(id, rating, feedback)` + `saveInf` incluye `rating, feedback, ratedAt, activeModules`.
- `src/views/pages/Guardados.jsx` muestra ★ promedio, lista con Stars, modal de calificación (1-5 + comentario para mejora continua).
- `views/common/Stars.jsx` es el único control de estrellas — lo usa tanto Guardados como
  `dashboard/RecentRatings.jsx`. No dupliques otro `Stars` local.

## Flujo colaborativo (Contribuciones)
Varias áreas (Selección, SST, Atención al Cliente/Ejecutivos, Bienestar — ver `DB.areas` en
`models/db.js`) suben su parte del informe de un cliente/período por separado; el Ejecutivo líder
del cliente valida cada parte y genera el informe fusionado. **Esto vive completo en
`localStorage` — no hay backend que sincronice entre navegadores/equipos distintos** (ver
"Roadmaps abiertos"), así que hoy funciona bien cuando el equipo comparte el mismo computador/perfil
de navegador; en varios dispositivos cada uno tiene su propia copia de `ps_v3`.
- `models/Contribucion.js`: entidad `Contribucion` (cliId × per × areaId), estados
  `pendiente → en_proceso → completado → validado` (o `rechazado`), `ESTADO_META` — ícono/label/
  color de cada estado, fuente única para cualquier vista que los pinte — y `rechazosCount`, que
  suma cada vez que `validarContribucion` rechaza (sobrevive a que luego se corrija y cambie de
  estado; es la base de la métrica de calidad del worker).
- `views/pages/MisContribuciones.jsx` (+ `views/pages/contribuciones/`): vista del worker de área.
  No es solo el formulario de la ficha/ISSA — también responde "¿qué tengo pendiente?"
  (`PendingGrid`, tarjetas clickeables por cliente en vez de un `<select>`), "¿qué me falta
  corregir?" (`RecomendacionesPanel`, lee `Contribucion.obs` de lo `rechazado` y lleva directo a esa
  ficha) y "¿qué tan bien voy?" (`QualityCard` + `contribuciones/stats.js`: % de contribuciones
  validadas sin corrección, reutilizando el `Gauge` del Dashboard). `HistorialList` es la pestaña
  con todo lo que el worker ha subido alguna vez, no solo el período actual. El título de la página
  ya no lleva el nombre del área (antes decía literalmente "Mis contribuciones — Selección y
  Contratación" para cualquiera, incluido un `super_admin`, porque el usuario semilla
  `Camilo García` tiene `areaId: 'a1'`) — el área es un chip secundario, y un `super_admin` puede
  elegir con un selector cuál área previsualizar, en vez de heredar una en silencio.
- `views/pages/TableroColaborativo.jsx` (+ `views/pages/tablero/`): vista del Ejecutivo líder.
  `ClientProgressCard` (tarjeta por cliente con `Gauge` de avance y chips de área),
  `ActivityFeed` (pulso de actividad reciente del equipo) y `RejectModal` (pide motivo al rechazar
  — se guarda en `Contribucion.obs`). Las tarjetas se agrupan por lo que necesita acción
  ("Necesitan tu validación" primero), no por orden arbitrario.
- `controllers/workflowController.js: fusionarContribuciones(cliId, per)` combina las partes de
  todas las áreas en un objeto listo para `buildInformePreviewHtml`/`buildInformeHTML` — es
  síncrono, así que exportar PDF/PPTX arma el HTML fusionado y exporta en la misma llamada, sin
  pasar por estado de React ni `setTimeout` (ese patrón causó un bug real — ver CHANGELOG).

## Mi equipo (`views/pages/EquipoAdmin.jsx` + `views/pages/equipo/`)
- Vista de admin/super_admin: CRUD de personas, asignación de clientes (muchos→uno) y avance
  mensual del equipo — la lógica vive toda en `EquipoAdmin.jsx` (igual que antes); lo que cambió
  es la presentación, movida a `views/pages/equipo/`.
- El equipo se agrupa por área con `TeamPod.jsx` (una "sala" por área, con el color/ícono que ya
  tiene en `DB.areas`) y cada persona es una `TeamMemberCard.jsx` — una sola tarjeta en vez de la
  fila de tabla + la fila de "seguimiento mensual" que antes vivían duplicadas. Si agregas un dato
  nuevo por persona, va en la tarjeta, no en una tabla aparte.
- `equipo/helpers.js` trae `avgQuality`/`lastActivityTs`/`last4MonthsTrend` — mismo cálculo que
  `dashboard/TeamGrid.jsx` usa para "todos los equipos"/"mi equipo" en el Dashboard, pero expuesto
  aparte a propósito para no acoplar esa vista con esta. Si cambias la fórmula de calidad o de
  tendencia en una, revisa si también aplica a la otra.
- El botón "🔗 Asignar clientes" de cada tarjeta solo hace `setTargetUser` + scroll hasta el panel
  de abajo — la asignación en sí sigue siendo la misma `assignClientesToUser` de siempre.

## Dashboard ejecutivo
- `src/views/pages/Dashboard.jsx` es el orquestador (qué mostrar según rol); el resto vive en
  `src/views/pages/dashboard/`: `charts.jsx` (Gauge, Sparkbars, Delta, TrendChart, BarList —
  primitivas sin librería externa), `utils.js` (`statusColor`, el semáforo verde/ámbar/rojo),
  `insight.js` + `InsightBanner.jsx` (la línea de estado más relevante al tope del panel),
  `TeamGrid.jsx` (tarjetas por ejecutivo, compartida entre super_admin y admin),
  `WorkspacesOverview.jsx`, `ModuleUsage.jsx` (`AdoptionChart` para admin/super_admin,
  `MyModulesGrid` para usuario) y `RecentRatings.jsx` (últimas calificaciones + feedback, reutiliza
  `views/common/Stars.jsx` — el mismo control que usa el modal de calificación en `Guardados.jsx`).
- SuperAdmin ve espacios + todos los equipos + adopción de módulos global; Admin ve su equipo con
  trend + adopción de su equipo; Usuario ve su cuadrícula de módulos (activos e inactivos) y las
  últimas calificaciones de sus propios clientes.
- Un ejecutivo sin clientes asignados (`p.total === 0` en `getTeamMonthlyProgress`) se muestra como
  "Sin clientes asignados" en `TeamGrid`, no como 0% en rojo — no cuenta como "atrasado" en
  `insight.js` tampoco. Si agregas más señales al `InsightBanner`, ten esto en cuenta.

## Barra lateral (`views/layout/Layout.jsx`)
- Nav estilo "Siamo" (referencia: `barra-siamo.html`, subida por el usuario) con animación de
  píldora + "notch" SVG que sigue al ítem activo — pero adaptada a barra izquierda y colores
  Proservis. `MENU`/`ICONS` viven **fuera** del componente (config estática); `filteredMenu` es un
  `useMemo` por `role`, no un array nuevo en cada render — si se recrea en cada render, el
  `useLayoutEffect` de la animación (que lo tiene como dependencia) se re-dispara en cada render de
  `Layout`, no solo al navegar (bug real, ver CHANGELOG).
- **Colapso: una sola fuente de verdad.** `isCollapsed = collapsed || narrowViewport`. `collapsed`
  es el botón manual; `narrowViewport` viene de `matchMedia('(max-width: 960px)')` (con listener
  `change`, no un `@media` de CSS aparte) — así el colapso manual y el automático por viewport
  angosto comparten exactamente la misma CSS (`.bar[data-collapsed="true"] ...`). Si agregas más
  estados de "ancho de barra", mantenlos derivados hacia `isCollapsed`, no dupliques la lógica de
  colapso en CSS puro.
- **Scroll:** `.bar-items` (no `.bar`) es la única región con `overflow-y:auto` — `.bar` sigue
  `overflow:visible` a propósito, para que la píldora pueda sobresalir del borde derecho. Si el
  menú crece, va ahí adentro; no agregues scroll a `.bar` ni saques el pie (`.bar-footer`) del flujo
  flex (depende de `margin-top:auto` + `.bar{display:flex;flex-direction:column}` para quedar
  pegado abajo).
- Transiciones de colapso usan `max-width`/`opacity` (nunca `display:none`) para que se sientan
  orgánicas — mismo criterio para cualquier elemento nuevo que deba ocultarse al colapsar.
- `.app-shell` ocupa todo el viewport (`width:100%;height:100vh`, sin margen) — no volver a la
  "tarjeta" centrada de `max-width` con `margin:auto`, dejaba franjas en blanco en monitores anchos.

## Comandos
```bash
npm install
npm run dev      # http://localhost:5173  (Vite)
npm run build    # dist/
npm run preview
```

## Variables de entorno (ver `.env.example`)
```
VITE_FIREBASE_API_KEY / AUTH_DOMAIN / PROJECT_ID / STORAGE_BUCKET / MESSAGING_SENDER_ID / APP_ID / MEASUREMENT_ID
VITE_GOOGLE_CLIENT_ID
```
Si no se definen, usa defaults de `reportes-pt-ejecutivos`. Firebase config es pública por diseño; seguridad real en Auth + Firestore rules.

## Convenciones
- Español colombiano, tono JARVIS: "Listo Señor", "Quedo atento Señor".
- Estilos: design system propio (vars `--vd #168A43`, `--am #E8BB26`, `--osc #12212D`, clases `card, kpi, btn, bvd/bam/bgh, tbl, b/bok/bbd` en `src/assets/styles/global.css`). No Tailwind/shadcn — pulido del sistema actual.
- No crear archivos puente en `src/store.js` etc. — ya fueron eliminados (usar `models/*` directo).
- Commits: mensaje corto en español, qué capa tocaste.
- Antes de PR: `npm run build` debe pasar.

## Qué NO hacer
- No exponer secretos SMTP en chat (están en `~/.config/opencode/reunion_smtp.json`).
- No hardcodear módulos: leer de `MODULOS`.
- No renderizar tab de módulo desactivado en HTML.
- No permitir a `admin` crear `super_admin`.

## Roadmaps abiertos
- Code-split por ruta (chunk 2.2MB actual).
- Hash de contraseñas local (hoy plain text para demo).
- Migrar `localStorage` a Firestore/REST cuando haya backend.

¿Dudas? Ver `docs/ARCHITECTURE.md`, `docs/MODEL.md`, `CHANGELOG.md`.
