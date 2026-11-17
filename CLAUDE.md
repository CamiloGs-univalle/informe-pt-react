# CLAUDE — Guía para el grupo de desarrolladores · Informe PT

Este archivo lo lee Claude Code / OpenCode al iniciar sesión. Define cómo trabajar en este repo sin romper la arquitectura. Para el panorama completo: `docs/ARCHITECTURE.md`, `docs/MODEL.md`, `docs/INFORME-QA-UX.md`, `CHANGELOG.md`.

## Stack
- React 19 + Vite, HashRouter, Firebase Auth + Firestore (proyecto `reportes-pt-ejecutivos`), xlsx, html2pdf.js, pptxgenjs.
- **Firestore es la fuente de verdad.** `src/models/db.js` mantiene el objeto `DB` en memoria y una caché en `localStorage["ps_v3"]`. Al iniciar sesión se carga desde el servidor (`loadDB({ force: true })`); cada `saveDB()` sincroniza solo las diferencias por id (`services/firebaseSync.service.js`). La sincronización se habilita **solo tras una carga exitosa del servidor**, para que una caché vieja no pise datos reales. Al cerrar sesión se vacía la caché (`resetDB`).
- No hay datos quemados (clientes, personas, áreas, módulos por área): todo sale de Firestore. Lo único fijo es el catálogo de módulos de informe (`models/constants.js: MODULOS`) y los estados/roles.

## Arquitectura
```
src/models       → dominio sin React; lee/escribe DB.* (Alcance.js = quién ve/hace qué)
src/controllers  → orquesta modelos + servicios (auth, reporting, workflow, informe)
src/services     → integraciones (Firestore sync, Drive, Excel, PDF, PPTX, HTML del informe, logos)
src/views        → React: pages / layout / common
src/routes       → AppRoutes (rutas lazy) + RequireCap (guard por capacidad)
src/config       → firebase + app.config (env VITE_*)
src/utils        → format.js (es-CO), ids.js, massUpload.js
```
**Regla de dependencias:** views → controllers → models/services. Nunca al revés.

## Roles y alcance (`models/Alcance.js`)
- Roles guardados: `super_admin`, `admin`, `usuario`. Perfiles **derivados** (no se guardan):
  - **Ejecutivo líder**: `cliente.ejId === user.id`, o su área está marcada `lidera` (en datos viejos sin ese campo: nombre de área /atenci[oó]n|ejecutiv/). Arma y entrega el informe final.
  - **Trabajador de área**: figura en `cliente.asignaciones[areaId]`. Sube su parte del informe.
- `capacidades(user)` decide menú y rutas. Para saber qué clientes/informes ve alguien usa SIEMPRE `clientesDe`, `clientesQueLidera`, `informesDe`, `equipoIds`, `tareasDe`; no filtres `DB.*` a mano en las vistas.
- Acceso: Firebase Auth es la única fuente de credenciales. **No se guardan contraseñas** (`saveEj` las descarta). Para que alguien entre, su correo debe estar en «Personas» y activa.
- No permitir a `admin` crear/editar `super_admin`; no permitir auto-eliminación (`canDeleteEj`).

## Flujo colaborativo
Cliente × período × área = una **contribución** (`models/Contribucion.js`): `pendiente → en_proceso → completado → validado` o `rechazado` (con motivo en `obs`; `rechazosCount` suma cada devolución y alimenta la métrica de calidad).
- Trabajador: `MisContribuciones` (+ `contribuciones/`). `AporteEditor` usa los mismos formularios de módulo que el líder (`nuevo-informe/ModuleSection` + hook `useInformeData`). Guarda borrador, envía (confirma), puede retirar el envío.
- Líder: `TableroColaborativo` (+ `tablero/`): valida o devuelve con motivo, ve el aporte, y con `workflowController.fusionarContribuciones(cliId, per)` arma el informe fusionado (vista previa, guardar, PDF/PPTX/HTML). Guardar un informe de un cliente+mes que ya existe pide confirmar el reemplazo (no duplica).
- Admin: `EquipoAdmin` (seguimiento), `AdminClientes` (líder y responsable por área), `AdminEjecutivos` (personas).
- Super admin: `SuperAdmin` (espacios y áreas; marcar «lidera el informe final», módulos y administrador por área), `AdminData` (cargas CSV con vista previa, respaldo JSON, sincronización).

## Módulos del informe
Catálogo en `models/constants.js: MODULOS`. Qué módulos aporta cada área: `area.modulos` (editable en «Espacios y áreas»).
**Qué módulos van en el informe de un cliente se decide en UN solo lugar: «Mis módulos»** (`ConfigModulos`), y la regla vive en `models/ModuloConfig.js`: `moduloIncluido(cli, modId)` es verdadero solo si el ejecutivo líder del cliente lo incluye **y** la persona asignada al área dueña del módulo lo reporta para ese cliente. Cada persona guarda su decisión global o por cliente (`moduloConfigs[userId]` y `moduloConfigs[userId_cliId]`). Úsalas siempre: `modulosEfectivos(cli)` (informe), `areaAplica(cli, area)` (¿hay tarea?), `setModulosEnClientes(...)` (escritura en lote). Un módulo apagado **no aparece** en el formulario del aporte, en HTML ni en PPTX, y un área sin módulos activos para un cliente no genera tarea (`tareasDe` ya lo filtra). Los textos libres del informe HTML se escapan con `esc()`; no insertes datos de usuario sin escapar.

**Conteos de pendientes:** la única definición de "qué le toca aportar a una persona" es `tareasDe(user)` (Alcance.js). Inicio del trabajador, Mis aportes y el avance del equipo (`reportingController`) la usan; no recalcules asignaciones a mano.

## Reporte HTML del informe (cliente final)
`buildInformeHTML` (services/htmlReport.service.js) arma un solo archivo sin internet. Piezas: `reportMetrics.js` (cifras, metas, semáforos, comparación con el mes anterior, mensajes y textos didácticos `EXPLICA`/`GLOSARIO`; puro, sin DOM), `reportCharts.js` (SVG/HTML con `data-tip`), `reportStyles.js` (CSS bajo `.rpt` + script). Reglas: texto de personas siempre con `esc()`/`parrafo()`; cero en movimiento de personal/clima/facturación = «sin datos», no un resultado; no inventar cifras; metas en `METAS`; un módulo apagado no se dibuja. El mes anterior sale de `informeController.informePrevio`. PDF: `pdf.service.generatePDF` detecta `.rpt`, agrega `.rpt-pdf`, convierte los SVG a PNG (html2canvas los recorta) y exporta vertical con todas las secciones; sin `letterRendering` (desalinea textos). Los informes viejos guardados no tienen `.rpt` y se exportan como antes.

## SST por módulos
`sst` (general: AT, OC, licencias, días EG, ARL, inducciones, casos médicos) + `sst_tasa` (`sst.sedes[{sede, at, expuestos}]`; la tasa se calcula, nunca se digita; sede «Nacional» = total) + `sst_severidad` (`sst.severidad{diasAT, conDias}`) + `sst_investigacion` (`sst.investigacion{total, investigados, aTiempo}`). `StepSST` muestra solo los bloques de los módulos activos (`modulos`). Cifras, metas (`METAS.tasaAT`, `METAS.investigacion`) y mensajes viven en `reportMetrics.js`; el informe HTML dibuja una sección por módulo dentro de la pestaña de SST.

## Aprobación y envío por correo
Informes guardados: `aprobarInf/quitarAprobacionInf` (`models/Informe.js`), permiso `puedeAprobarInforme` (admin o super admin del equipo). El ejecutivo ve «Enviar por correo» solo si `estaAprobado(inf)` (o `EXIGIR_APROBACION=false`). `controllers/correoController.js` arma la plantilla desde las mismas métricas del informe y `services/correo.service.js` crea el borrador de Gmail con adjuntos (`gmail.compose`) o el `.eml`. Nunca se envía solo: la persona pulsa «Enviar».

## Convenciones de UI (no las rompas)
- Identidad Proservis: verde `#168A43` (`--vd`), ámbar `#E8BB26` (`--am`), azul oscuro `#12212D` (`--osc`). Estilos en `assets/styles/global.css` (base) y `app.css` (sistema de diseño actual). Sin Tailwind.
- Tamaños: nada por debajo de 11px. No uses `text-overflow: ellipsis` en nombres de personas/clientes/áreas (usa wrap; `.text-ellipsis` es un corte a 2 líneas).
- **Números y fechas siempre en es-CO** con `utils/format.js` (`fmtNum`, `fmtDec`, `fmtMoney`, `fmtPct`, `fmtNit`, `plural`, `fmtPerLong`, `fmtFechaHora`, `periodoActual` en hora local). Nunca `toFixed`/`toLocaleString` sueltos para mostrar.
- Períodos: componente `PeriodPicker` (no `<input type="month">`). Mensajes: `useToast()`; confirmaciones: `await useConfirm()({title,message,confirmLabel,danger})`. **Nada de `alert()`/`confirm()`.**
- Toda página usa `PageHeader`; estados vacíos con `EmptyState` (dice qué hacer). Todo botón hace algo o está deshabilitado con motivo visible.
- Ids nuevos: `nuevoId(prefijo, lista)` de `utils/ids.js` (nunca `prefijo + Date.now()`: colisiona en cargas masivas).
- Logos de clientes: `ClienteLogo` + `services/logos.service.js` (manifest generado por `npm run logos`); las fotos se comprimen (900px) por el límite de 1 MB de Firestore.

## Comandos
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/  (corre antes el manifest de logos)
npm run lint
```

## Variables de entorno (`.env.example`)
`VITE_FIREBASE_*`, `VITE_GOOGLE_CLIENT_ID`, `VITE_SORTTIME_URL` (enlace al sistema de tiempos; si no se define, el botón no aparece). La config web de Firebase es pública por diseño; la seguridad real está en Auth + `firestore.rules`.

## Qué NO hacer
- No guardar contraseñas, tokens ni credenciales en código o en Firestore. No commitear JSON de cuentas de servicio ni exportaciones de datos reales.
- No hardcodear ids de áreas, personas o clientes.
- No renderizar secciones de módulos desactivados.
- No exponer secretos en el chat.

## Pendientes conocidos
Ver `docs/INFORME-QA-UX.md` §Pendientes: depurar historial de git del archivo con contraseña compartida; campos numéricos de los formularios que arrancan en 0 (distinguir «no lo llenó» de «es cero» exige normalizar '' → 0 en todos los consumidores del informe).

## Reglas de Firestore y perfiles
`firestore.rules` lee el rol de `perfiles/<correo>` (la app lo mantiene al guardar personas; `npm run perfiles` lo carga/repara; `npm run restaurar` recrea `ejecutivos` desde un JSON local ignorado por git). Leer: cualquier persona del dominio con correo verificado. Escribir áreas/espacios: super admin; personas: super admin, y admin sin tocar super admins; el resto: persona activa con perfil. `firestore.rules.dominio` es la versión simple de respaldo.
