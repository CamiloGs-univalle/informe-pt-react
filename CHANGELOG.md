# Changelog

## [Sin publicar] — "Mi equipo": rediseño como equipo real, no tabla plana (septiembre 2026)

Rediseño completo del módulo "Mi equipo" pedido explícitamente: más diseño, que se sienta como
una comunidad/oficina real, que se vea al equipo trabajando, y sin perder ninguna función que ya
tenía (CRUD de personas, asignación de clientes muchos→uno, seguimiento mensual).

### Cambiado

- **Se unificaron dos bloques redundantes en uno.** Antes había una lista de "Seguimiento
  mensual" y, debajo, una tabla de "Personas" — ambas repetían nombre, rol, área y cliente. Ahora
  es una sola tarjeta por persona (`views/pages/equipo/TeamMemberCard.jsx`) con avance (anillo,
  reutilizando `Gauge` del Dashboard), tendencia de los últimos 4 meses (`Sparkbars`), calidad
  promedio (mismo cálculo que `dashboard/TeamGrid.jsx`), última actividad ("hace 2 días", con un
  punto de presencia verde si generó algo en la última semana) y las acciones de editar/eliminar/
  asignar clientes — sin quitar ninguna de las funciones que ya existían.
- **El equipo se agrupa por área** (`views/pages/equipo/TeamPod.jsx`) — cada área es su propia
  "sala", con el color y la descripción que ya tenía en `DB.areas` (Selección, SST, Atención al
  Cliente...) y un ícono propio. Con varias áreas (el caso de Super Admin) se siente como recorrer
  distintos equipos de la oficina; con una sola área (el caso típico de un Admin) sigue siendo una
  sección bien enmarcada, no una tabla suelta.
- **"Asignar clientes" quedó integrado con las tarjetas.** Cada tarjeta tiene un botón "🔗 Asignar
  clientes" que deja lista a esa persona como destino en el panel de abajo y hace scroll hasta
  ahí — la delegación de clientes queda a un clic en vez de tener que buscar de nuevo a la persona
  en el selector. El panel también muestra ahora un aviso claro de cuántos clientes están "sin
  equipo" (o que ya todos tienen dueño) en vez de solo un texto gris.
- Se agregó una quinta métrica al resumen del equipo: **calidad promedio** (calificaciones de
  informes, 1-5), calculada sobre todos los informes del equipo visible.

### Nuevo

- `views/pages/equipo/helpers.js`: funciones puras — ícono por área, última actividad y calidad
  promedio por persona, tendencia de 4 meses (mismo cálculo que ya usaba `TeamGrid.jsx`, ahora
  compartido sin acoplar ambas vistas) — y `ROLE_COLOR`, el color de acento por rol (super_admin
  navy, admin azul, usuario verde) reutilizado tanto en las tarjetas como en la tabla de
  asignación.

## [Sin publicar] — Barra lateral: fila vacía sobre "PRINCIPAL" (septiembre 2026)

Al quitar el wordmark "Proservis Temporales", la fila `.bar-head` que lo alojaba (62px, luego
46px) quedó como espacio muerto con el botón de colapsar solo en la esquina — ya no tenía razón
de ser como fila propia.

### Corregido

- **Se eliminó `.bar-head` como fila de layout.** El botón de colapsar (la flechita) ya no reserva
  una franja de alto completa: ahora flota como una pastillita circular a caballo del borde
  derecho de la barra (`position:absolute`, mismo recurso que ya usa la píldora animada para
  "salirse" del borde), así que "PRINCIPAL" queda pegado justo debajo de la esquina redondeada,
  sin espacio de por medio.

## [Sin publicar] — Barra lateral: filas apretadas y wordmark (septiembre 2026)

Con el scroll de `.bar-items` ya en su sitio, seguía viéndose "todo muy junto" — filas y
badges pisándose entre sí — y se pidió quitar el nombre "Proservis Temporales" del encabezado
de la barra.

### Corregido

- **La causa real de "todo apretado" no era falta de scroll — era que el scroll nunca se
  activaba.** `.bar-item` y `.bar-section` son hijos flex de `.bar-items` (que es
  `display:flex;flex-direction:column`), y sin `flex-shrink:0` el navegador los iba **encogiendo**
  para que todos cupieran en el alto disponible, en vez de dejar que `.bar-items` (que ya tenía
  `overflow-y:auto`) hiciera scroll — `overflow` solo entra en juego cuando el contenido ya no se
  puede seguir comprimiendo. Eso explicaba también las filas e insignias ("Atención al Cliente",
  "Área") pisándose: al perder alto, el contenido de una fila se montaba sobre la siguiente. Con
  `flex-shrink:0` cada fila mantiene su tamaño real y el que sobra ahora sí hace scroll.
- **Mejor distribución.** Con el scroll ya funcionando de verdad, no hace falta apretar todo para
  que quepa: se subió el margen entre secciones (14px → 18px), se agregó un pequeño espacio entre
  filas (`margin:2px 0`) y más aire arriba/abajo de la lista.
- **Se quitó el wordmark "Proservis Temporales"** del encabezado de la barra — el botón de
  colapsar queda solo, alineado a la derecha.

## [Sin publicar] — Barra lateral (Layout.jsx): scroll, colapso y responsive (septiembre 2026)

Revisión a fondo de la barra lateral pedida explícitamente: la animación se sentía "tosca",
no se podía bajar para ver los módulos que quedaban debajo del pliegue, y al encogerla a mano
(o en pantalla angosta) todo se veía "salido" y sin transición. Además, la "tarjeta" centrada de
`.app-shell` dejaba franjas en blanco enormes en pantallas anchas.

### Corregido

- **No se podía hacer scroll para ver todos los módulos.** `.bar` no era `display:flex`, así que
  `margin-top:auto` del pie no se pegaba abajo de verdad, y no existía ninguna región con scroll
  propio — los ítems que no cabían quedaban recortados por `.app-shell{overflow:hidden}` sin forma
  de llegar a ellos. Ahora `.bar-items` es la única región que hace scroll (con una scrollbar fina
  a juego), el encabezado y el pie quedan fijos, y la píldora animada se desvanece si el ítem activo
  queda fuera del área visible en vez de quedar flotando encima de otra sección.
- **Colapso "tosco" e inconsistente.** Había dos sistemas de colapso compitiendo: el botón manual
  (estado `collapsed`) y un `@media(max-width:960px)` aparte que forzaba el modo ícono-solo por su
  cuenta. Colapsar a mano en escritorio ancho nunca aplicaba el centrado de íconos (solo lo hacía
  la media query), y el cálculo del ancho de la píldora usaba la fórmula equivocada en pantallas
  angostas. Ahora hay una sola fuente de verdad — `isCollapsed = collapsed || narrowViewport`
  (con `narrowViewport` desde `matchMedia`) — y una única regla CSS para el modo colapsado.
- **Transiciones abruptas (`display:none`).** El nombre "Proservis Temporales" y el subtítulo del
  área desaparecían de golpe al colapsar. Ahora usan `max-width`/`opacity` animados, a la misma
  velocidad que el ancho de la barra, para que se sienta orgánico en vez de brusco.
- **Encabezados de sección desbordados al colapsar.** Textos como "ADMINISTRACIÓN" no tenían manejo
  para el riel angosto de 80px. Ahora se convierten en una línea divisoria delgada en vez de
  recortarse a la mitad.
- **Callejón sin salida en móvil.** `@media(max-width:640px){.bar{display:none}}` ocultaba la barra
  por completo por debajo de 640px sin ningún botón ni menú para volver a abrirla. Por debajo de
  960px la barra ya se colapsa sola al modo ícono-solo, así que ahora simplemente se angosta un
  poco más (64px) en vez de desaparecer — siempre visible y usable.
- **Franjas en blanco enormes en pantallas anchas.** `.app-shell` era una "tarjeta" centrada de
  `max-width:1320px` con márgenes de 20px — en cualquier pantalla más ancha que eso (la mayoría de
  monitores de oficina) dejaba bandas blancas grandes a los lados. Ahora ocupa todo el viewport,
  sin margen, con `#root`/`body` a `height:100%` para que el layout sea realmente responsive.

## [Sin publicar] — Barra lateral (Layout.jsx): íconos rotos y hueco visual en el notch (septiembre 2026)

La barra lateral (estilo "Siamo") venía tumbando toda la app (`ReferenceError: roleColor is not
defined`, ya corregido antes) y, una vez arriba, se veía rota: todos los íconos del menú mostraban
el mismo documento genérico, y el "notch" animado (la bolita blanca que se mete en el borde de la
barra) dejaba un hueco/parpadeo visible en vez de encajar limpio.

### Corregido

- **Íconos idénticos en todo el menú.** `MENU` ya usa las claves reales de `ICONS`
  (`'monitor'`, `'users'`, `'chart'`...), pero el render todavía tenía una tabla vieja que traducía
  símbolos que ya no se usan (⊞ ◉ ◈ ✎ ...) — como ninguno hacía match, TODO caía en `'file'` por
  defecto. Ahora usa `item.icon` directo.
- **Hueco/parpadeo en el notch del sidebar.** `filteredMenu` se recreaba (array nuevo) en cada
  render de `Layout`, y estaba en las dependencias del `useEffect` de la animación — así que ese
  efecto se re-ejecutaba en cada render, no solo al navegar, dejando temporizadores y animaciones
  superpuestos peleando por escribir el mismo `path` del SVG. Se movió `MENU`/`ICONS` fuera del
  componente (son config estática) y `filteredMenu` ahora es un `useMemo` por `role`, así que el
  efecto solo corre cuando el ítem activo cambia de verdad. También se cambió a `useLayoutEffect`
  (pinta antes del primer paint, sin el salto inicial desde una posición inventada) y se separó la
  animación real del simple recálculo por resize/collapse.

## [Sin publicar] — Mis contribuciones: calidad de trabajo, feedback e historial reales (septiembre 2026)

### Corregido (después del primer rediseño)

- **El título ya no se apropia del nombre de un área.** Decía literalmente "Mis contribuciones —
  Selección y Contratación" con la descripción del área pegada al lado, para cualquiera que la
  viera — incluido un Super Admin (el usuario de pruebas `Camilo García` tiene `areaId: 'a1'` en
  los datos semilla, aunque un Super Admin no es realmente un colaborador de esa área). El título
  ahora es solo "Mis contribuciones"; el área queda como un chip secundario de contexto, no como
  el titular de la página.
- **Super Admin ya no queda pegado a un área por lo que diga su registro de prueba.** Como no tiene
  una única área operativa, ahora puede elegir con un selector cuál área quiere previsualizar o
  trabajar — con una nota explicando por qué ve ese selector (antes lo hacía en silencio, sin
  explicación, y parecía un dato mal cargado en vez de una decisión).


"Mis contribuciones" (la vista del trabajador — psicólogo, SST) era solo un `<select>` con los
pendientes del período y un formulario: no había forma de ver lo ya trabajado, ni el feedback de un
rechazo, ni ninguna señal de qué tan bien va el trabajo de uno. Se reescribió con un nuevo módulo
`views/pages/contribuciones/` (`QualityCard`, `RecomendacionesPanel`, `HistorialList`, `PendingGrid`,
`stats.js`) más una métrica nueva en el modelo.

### Nuevo

- **`models/Contribucion.js`: `rechazosCount`.** Cada vez que `validarContribucion` rechaza, suma un
  contador en la contribución. Antes, al volver a subirla, el estado cambiaba y el rechazo quedaba
  invisible — con este contador se puede saber si algo pasó validación a la primera o con correcciones,
  incluso después de corregirse.
- **"Mi calidad de trabajo" (`QualityCard`).** Un anillo con el % de contribuciones que el Ejecutivo
  validó sin pedir correcciones (reutiliza el `Gauge` del Dashboard), más el total validado y el total
  de correcciones pedidas — la señal la pone quien revisa el trabajo, no quien lo sube.
- **"Correcciones pedidas por tu Ejecutivo" (`RecomendacionesPanel`).** Si algo quedó `rechazado`, el
  motivo (`Contribucion.obs`) aparece arriba de todo con un botón "Corregir ahora" que lleva
  directo a esa ficha, en su período. Antes ese motivo se perdía — solo el líder lo veía en el Tablero.
- **"Mi historial" (`HistorialList`).** Pestaña nueva con todas las contribuciones del trabajador,
  cualquier período, más recientes primero, con su estado y el motivo cuando fue rechazada.
- **Pendientes ahora es un grid clickeable (`PendingGrid`)**, no un `<select>` plano: cada tarjeta
  muestra de una vez el estado (sin iniciar / en proceso / con corrección) del cliente, con buscador
  por nombre.
- **KPIs e insight de una línea** arriba de todo (pendientes hoy, completadas del período, validadas
  histórico, con corrección) y un banner que prioriza correcciones > pendientes > calidad > "vas al día",
  reutilizando `InsightBanner` del Dashboard para que el mismo patrón signifique lo mismo en toda la app.
- **`.pulse-dot` / `.fade-in`** en `global.css`: dos animaciones utilitarias mínimas (pulso para lo que
  necesita acción, fade-in suave para listas) — reutilizables en cualquier vista, no solo esta.

### Detalle menor

- `esEditable` existía en el archivo pero nunca se usaba (warning de lint); ahora los botones de
  guardar/completar también la respetan — es el mismo resultado que antes (es el complemento lógico
  de `estaCompletado`), pero deja la intención explícita en vez de una variable muerta.

## [Sin publicar] — Tablero colaborativo: agrupado por lo que necesita acción, con pulso de actividad (septiembre 2026)

El Tablero colaborativo (vista del líder) era una lista plana de clientes con un semáforo por área
sin agrupar, y tenía dos bugs reales: exportar PDF/PPTX dependía de un `setTimeout` que leía estado
de React potencialmente obsoleto, y "Rechazar" no pedía ningún motivo. Se reescribió en
`views/pages/tablero/` (`ClientProgressCard`, `ActivityFeed`, `RejectModal`) más el orquestador
`TableroColaborativo.jsx`.

### Corregido (bugs reales)

- **Exportar PDF/PPTX ya no depende de `setTimeout`.** Antes el botón llamaba
  `handleGenerar(cli.id)` y luego `setTimeout(handlePDF, 600)`, confiando en que React hubiera
  vuelto a renderizar (y recreado `handlePDF`) antes de que el timeout disparara — con un clic
  rápido o una máquina lenta, `handlePDF` podía ejecutarse con el `preview`/`selected` de un render
  anterior. Ahora `handleExport(cliId, tipo)` arma el HTML fusionado y exporta en la misma llamada,
  sin pasar por estado intermedio ni temporizadores.
- **"Rechazar" ahora pide un motivo** (`RejectModal`, reutiliza `views/common/Modal.jsx`) y lo
  guarda en `Contribucion.obs` — antes rechazaba sin que el área supiera qué corregir.
- **Chip "SST" duplicado en el encabezado de áreas**: cuando hay dos registros de Área con el mismo
  nombre (creados por separado en "Espacios y Áreas"), el chip informativo del encabezado ahora se
  deduplica por nombre. El semáforo por cliente sigue distinguiendo cada área por su id real — solo
  el rótulo del encabezado se simplifica.
- **`downloadHTML` duplicado**: el archivo importaba el de `services/pdf.service.js` con un alias
  que nunca se usaba, y llamaba en su lugar a una función local casi idéntica definida al final del
  archivo. Ahora usa una sola.
- **`models/Contribucion.js`**: se quitó `keyOf`, una función sin ningún uso.

### Nuevo

- **Tarjetas agrupadas por lo que necesita tu atención**, no por orden arbitrario: "Necesitan tu
  validación" → "Con correcciones pendientes" → "En progreso" → "Listos y validados" → "Sin
  iniciar". Antes había que leer cliente por cliente para saber qué te tocaba a ti.
- **`ActivityFeed`**: pulso de las últimas actualizaciones del equipo en el período ("Selección
  completó su parte de 4 Pajaros S.A.S. · hace 12 min") — para que el tablero se sienta como que
  todos están trabajando en simultáneo, no como una foto estática.
- **KPIs del período** arriba del tablero: avance promedio (con el mismo anillo `Gauge` del
  Dashboard), cuántos necesitan tu validación, cuántos están listos, cuánta actividad reciente hubo.
- **`ESTADO_META`** en `models/Contribucion.js`: ícono, texto y color por estado
  (pendiente/en_proceso/completado/validado/rechazado) en un solo lugar, para que el Tablero y
  cualquier otra vista pinten el mismo semáforo de forma idéntica.
- **`utils/format.js: timeAgo(iso)`**: tiempo relativo en español ("hace 5 min", "ayer") — usado en
  cada chip de área y en el pulso de actividad.
- Cada tarjeta de cliente ahora muestra su anillo de avance (`Gauge`, el mismo componente del
  Dashboard) y, cuando todas las áreas están validadas, un 🎉.
- `views/pages/MisContribuciones.jsx`: el badge de "pendientes" usaba `className="badge ok"`, una
  clase CSS que no existe en `global.css` (no tenía ningún estilo aplicado) — se cambió a `b bok`,
  la clase real que usa el resto de la app para el mismo tipo de indicador.

## [Sin publicar] — Dashboard rediseñado: gráficas reales, insight automático y calidad visible (septiembre 2026)

El Dashboard tenía KPIs y un par de gráficas básicas hechas con `<div>`s de altura fija; se
reconstruyó como una vista compuesta en `views/pages/dashboard/`, con gráficas propias (sin
librería nueva, siguiendo la convención del proyecto de pulir el sistema de diseño actual) y datos
que antes no se mostraban en ningún lado del panel principal.

### Nuevo

- **`InsightBanner`** (`dashboard/InsightBanner.jsx` + `insight.js`): una sola línea al tope del
  panel con la lectura más importante del momento — calificaciones bajas recientes primero, luego
  equipo atrasado, luego pendientes, y si no hay nada de eso, confirmación de que todo va bien. Antes
  había que escanear cada tarjeta para saber si algo necesitaba atención.
- **`TrendChart`** (`dashboard/charts.jsx`): la barra de tendencia de 6 meses ahora tiene tooltip al
  pasar el mouse (mes completo, conteo, variación vs. el mes anterior), estado vacío cuando no hay
  datos todavía, y un resumen de tendencia (creciendo/bajando vs. la primera mitad del período).
- **`Gauge`, `Sparkbars`, `Delta`, `BarList`**: primitivas reutilizables — anillo de avance,
  mini-tendencia por ejecutivo, insignia ▲/▼ de cambio vs. el mes anterior, y barras horizontales de
  magnitud con etiqueta directa. `statusColor` (verde ≥80%, ámbar ≥50%, rojo debajo) centraliza el
  semáforo que antes estaba repetido en cada bloque.
- **`AdoptionChart`** (admin / super_admin): qué tan usado está cada uno de los 13 módulos del
  catálogo en los informes ya generados — antes no existía ninguna vista de esto.
- **`MyModulesGrid`** (usuario): reemplaza la lista que solo mostraba los módulos *activos* por una
  cuadrícula con TODOS los módulos y su estado (✓ en el informe / no aparece) — deja explícita la
  personalización por cliente en el mismo lugar donde el usuario ya pasa tiempo.
- **`RecentRatings`**: últimas calificaciones (★ + feedback del cliente) traídas al Dashboard,
  con los informes de 3★ o menos resaltados como "Necesita atención" — antes solo se veían entrando
  a Guardados. Usuario ve las de sus propios clientes; admin/super_admin ven las de su equipo.
- **`WorkspacesOverview`**: las tarjetas de "Espacios — vista global" ahora incluyen un anillo de
  avance del mes por espacio (antes solo mostraban conteos de áreas/clientes).
- **`views/common/Stars.jsx`**: el control de 1-5 estrellas vivía duplicado dentro de
  `Guardados.jsx`; se extrajo para que `RecentRatings` (Dashboard) y Guardados compartan el mismo
  componente en vez de dos implementaciones idénticas.

### Cambiado

- **`TeamGrid`** unifica los dos bloques de "seguimiento de equipo" que Dashboard tenía por
  separado para super_admin (`slice(0,6)`) y admin (equipo completo) — antes eran ~70 líneas de
  JSX casi idéntico en cada rol; ahora es un componente con un `limit` opcional. También corrige un
  caso borde: una persona sin clientes asignados mostraba 0% en rojo como si estuviera "atrasada";
  ahora se distingue como "Sin clientes asignados" y no cuenta como atraso ni en la tarjeta ni en el
  `InsightBanner`.
- **`Dashboard.jsx`** pasó de ~290 líneas con todo el marcado inline a un orquestador que decide
  *qué* mostrar según el rol (super_admin / admin / usuario) y delega el *cómo* a los componentes
  de `dashboard/`.

## [Sin publicar] — El wizard de "Nuevo informe" ahora respeta los módulos activos (septiembre 2026)

- **Bug: en modo Manual, el wizard mostraba TODOS los pasos** (Headcount, Selección, Rotación,
  SST, Nómina, Fotos) sin importar cuántos módulos tuviera activos el usuario/cliente — aunque el
  banner "Módulos activos" ya mostraba el número correcto (p. ej. 2: sst, fotos), el indicador de
  pasos y el contenido del paso seguían recorriendo los 9 pasos fijos, incluyendo los de módulos
  desactivados (con sus campos siempre en 0, porque nunca se llenaban).
- **Corrección**: `views/pages/nuevo-informe/steps.js` ahora expone `getManualSteps(activeModulos)`
  y `getAutoSteps(activeModulos)`, que filtran `STEPS_MANUAL` / `STEPS_AUTO` dejando solo los pasos
  sin módulo asociado (Cliente, Vista previa, Exportar, y en modo automático también
  Archivos/Revisar/Ajustar, que trabajan con todo el Excel a la vez) más los pasos cuyo módulo esté
  activo. Se resolvió además un desajuste de nombres entre el id de paso `photos` y el id de módulo
  `fotos` (mismo módulo, nombres distintos) mapeándolos explícitamente.
- **`views/pages/NuevoInforme.jsx`**: los índices fijos `AUTO_STEP` / `MANUAL_STEP` (que asumían
  una secuencia de 9 pasos siempre completa) se reemplazaron por un lookup id → índice calculado a
  partir del array de pasos ya filtrado (`Object.fromEntries(steps.map((s, i) => [s.id, i]))`), para
  que la navegación ("Siguiente", "Anterior", clic en el indicador) siga funcionando aunque la
  cantidad de pasos cambie según los módulos activos.
- Verificado con un script de prueba aparte que compara la secuencia filtrada esperada contra la
  real para varios casos (todos los módulos activos, solo 2 activos, ninguno activo) y confirma que
  el lookup de índices coincide con las posiciones del array filtrado.

## [Sin publicar] — Segunda pasada: pulido de arquitectura y corrección de bugs (septiembre 2026)

Tras la migración a la arquitectura por capas (sección siguiente), se hizo una segunda pasada
para eliminar todo lo que quedaba señalado como deuda técnica, cerrar un hueco de seguridad y
corregir bugs de datos encontrados durante la revisión — sin cambiar el comportamiento visible
salvo donde el comportamiento anterior era, precisamente, el bug.

### Corregido (bugs reales, no solo estilo)

- **El informe generado mostraba siempre 0 en "Solicitadas" y "Contratadas" (Selección).**
  `services/htmlReport.service.js` leía `r.sol` / `r.con`, pero los datos reales usan
  `r.solicitadas` / `r.contratadas` desde que existen los modelos — un desajuste de nombres que
  hacía que la tabla de RQs y el % de efectividad salieran siempre en cero en todo informe
  exportado. Corregido y verificado con datos de prueba.
- **La tabla "Casos médicos" del informe no mostraba identificación, CIE-10 ni seguimiento.**
  Mismo tipo de desajuste: el generador leía `c.idc` / `c.diag` / `c.seg` en vez de
  `c.identificacion` / `c.cie10` / `c.seguimiento`. Además, el badge de color por "Origen AT"
  comparaba contra `'AT'` cuando el valor real es `'AT laboral'`, así que nunca coloreaba ese
  caso correctamente. Corregido y verificado.
- **Hueco de seguridad: contraseña maestra en el login local.**
  `models/Ejecutivo.js#authenticateLocal` aceptaba `123456` o `Proservis2026` como contraseña
  válida para **cualquier** usuario, sin importar su contraseña real guardada — en la práctica,
  una puerta trasera. Ahora solo se acepta la contraseña real de cada Ejecutivo. Las cuentas demo
  documentadas (`Proservis2026`) siguen funcionando igual porque es su contraseña real de
  semilla; se actualizó el texto de ayuda en la pantalla de login que mencionaba `123456`.

### Eliminado (deuda técnica resuelta)

- **`utils/notify.js#toast()`** — el toast basado en `document.getElementById('toast')` que no
  hacía nada (buscaba un elemento que no existe) fue eliminado. Las 6 vistas que lo usaban
  (`DriveExplorer`, `ConfigModulos`, `NuevoInforme`, `EquipoAdmin`, `Guardados`, `SuperAdmin`)
  ahora usan `useToast()` (de `views/common/useToast.js`, separado de `Toast.jsx` para no romper
  Fast Refresh) — las notificaciones ahora sí se muestran en pantalla.
- **Los 12 archivos "puente" de la migración anterior** (`src/store.js`, `src/config.js`,
  `src/firebase.js`, `src/gdrive.js`, `src/htmlGenerator.js`, `src/pdfGenerator.js`,
  `src/multiExcelParser.js`, `src/logos.js`, `src/style.css`, `src/driveAuth.js`,
  `src/excelParser.js`, `src/components/*`) — ya no hacía falta mantenerlos como red de
  seguridad; se confirmó que nada los importaba y se borraron. Si tu copia local todavía los
  tiene, corre `cleanup-legacy-shims.ps1` una vez (ver más abajo).
- **Escritura muerta en `localStorage`**: `models/ModuloConfig.js#saveModuloConfig` escribía una
  copia de respaldo bajo `ps_modulo_cfg_<key>` que nada leía jamás (la config real vive en
  `ps_v3`). Eliminada.
- **`isConnected()` en `services/googleDrive.service.js`** — duplicaba exactamente a
  `!!getStoredToken()` y no lo usaba ningún componente. Eliminada.

### Cambiado (refactors internos, mismo comportamiento)

- **`views/pages/NuevoInforme.jsx` (antes ~650 líneas) se dividió** en un orquestador delgado más
  16 subcomponentes de paso en `views/pages/nuevo-informe/` (uno por paso del wizard, más
  `steps.js` con la definición de ambas secuencias). Verificado con una comprobación automática de
  que cada índice de paso coincide exactamente con el array de pasos correspondiente.
- **`models/db.js` tenía la misma lógica de carga/migración duplicada dos veces** (una vez en
  `loadDB()` y otra, ligeramente distinta, en el `initDB()` que corre al cargar el módulo). Se
  unificó en una sola función; `loadDB()` es ahora la única fuente de verdad y el efecto de
  módulo simplemente la invoca una vez.
- **Duplicación de constantes**: el arreglo de meses en español y `FOTOLABELS` estaban repetidos
  textualmente en `services/htmlReport.service.js` (además de en `utils/format.js` /
  `models/constants.js`, que son las fuentes reales). Ahora se importan desde ahí. También se
  eliminó un arreglo de meses duplicado en `controllers/informeController.js`.
- **`App.jsx`**: el listener de Firebase Auth leía `user` de un closure que quedaba "congelado" en
  su valor inicial (el efecto se suscribe una sola vez); ahora usa la forma funcional de
  `setUser(prev => ...)`, evitando que una sesión de Firebase pudiera pisar una sesión local ya
  iniciada.
- **`routes/AppRoutes.jsx`**: la ruta `/guardados` era la única del grupo "usuario y superiores"
  sin el guard `RequireRole` (inconsistencia sin impacto práctico hoy, ya que cubre los 3 roles
  existentes, pero sí de cara a futuro). Ahora es consistente con el resto de rutas del grupo.
- `views/common/DriveExplorer.jsx`: se eliminó el estado `currentFolder` (se actualizaba pero
  nunca se leía) y se resolvieron las 2 advertencias de ESLint sobre dependencias de hooks.
- `views/pages/NuevoInforme.jsx`: se eliminó el setter `setLogo` sin usar (el campo `logo` queda
  documentado como reservado para una futura UI de logo personalizado).
- `services/excel.service.js`: `NuevoInforme.jsx` ahora usa el helper ya existente
  `parseMultipleExcels` en vez de reimplementar el mismo `Promise.all(...)` inline.

### Script de limpieza (`cleanup-legacy-shims.ps1`)

Se incluye un script de PowerShell, en la raíz del proyecto, que borra los archivos puente
listados arriba si todavía existen en tu copia local (no falla si ya no están — es seguro
correrlo más de una vez). Se agregó porque el entorno usado para esta limpieza no tuvo permiso
para borrar archivos directamente en esta máquina en el momento de aplicar los cambios. Para
correrlo: clic derecho → "Ejecutar con PowerShell", o desde una terminal en la raíz del proyecto:

```powershell
./cleanup-legacy-shims.ps1
```

### Verificación

- `npm run build` — compila sin errores (99 módulos).
- `npm run lint` — 0 errores, 0 advertencias.
- El bug de `htmlReport.service.js` se verificó con un caso de prueba real (datos de ejemplo →
  HTML generado → se confirmó que las cifras de Selección y los campos de Casos médicos aparecen
  correctamente), no solo con lectura de código.

## [Sin publicar] — Migración a arquitectura por capas (septiembre 2026)

Reorganización completa del código en una arquitectura por capas inspirada en MVC (adaptada a una
SPA de React sin backend — ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para el porqué), más
documentación, buenas prácticas de tooling y variables de entorno. **No se cambió ningún
comportamiento visible de la aplicación** (mismas rutas, mismos roles, mismos datos, mismas
integraciones) — es una reorganización estructural, no una reescritura funcional.

### Añadido

- **Nueva estructura de carpetas**: `src/models/`, `src/controllers/`, `src/services/`,
  `src/views/{pages,layout,common}/`, `src/routes/`, `src/config/`, `src/utils/`, `src/assets/`.
  Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **`src/store.js`** (~380 líneas, mezclaba persistencia + reglas de negocio de 5 entidades
  distintas) se dividió en `models/db.js`, `models/constants.js`, `models/Ejecutivo.js`,
  `models/Cliente.js`, `models/Informe.js`, `models/Workspace.js`, `models/ModuloConfig.js`,
  `controllers/reportingController.js`, `utils/format.js` y `utils/notify.js`.
- **Controladores nuevos**: `controllers/authController.js` (orquesta Firebase Auth + fallback
  local, antes vivía inline en `Login.jsx`) y `controllers/informeController.js` (arma el HTML del
  informe, el nombre de archivo y el guardado, antes vivía inline en `NuevoInforme.jsx`).
- **Documentación**: este `CHANGELOG.md`, `docs/ARCHITECTURE.md`, `docs/MODEL.md`,
  `docs/DEPLOYMENT.md`, y un `README.md` renovado.
- **Variables de entorno** (`.env.example`): `src/config/firebase.js` y
  `src/config/app.config.js` ahora leen `VITE_FIREBASE_*` / `VITE_GOOGLE_CLIENT_ID` con los
  valores actuales como *fallback*, para no romper el despliegue existente.
- **ESLint** (`eslint.config.js`, flat config de ESLint 9) con `eslint-plugin-react`,
  `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`; nuevo script `npm run lint`.
- Comentarios JSDoc en todos los módulos de `models/`, `controllers/`, `services/`, `utils/` y
  `config/` explicando su responsabilidad.

### Corregido

- `views/layout/Layout.jsx`: se eliminó una clave `marginTop` duplicada en un `style` inline
  (detectada por ESLint, `no-dupe-keys`) — no cambia el resultado visual actual, solo limpia el
  código.
- `services/htmlReport.service.js`: se quitó un `\` innecesario antes de `/script` en el HTML
  generado (detectado por ESLint, `no-useless-escape`) y una constante local sin usar
  (`MOTIVOS_PRE`, duplicada de `models/constants.js`).
- Varios `import`s no utilizados eliminados durante la migración de componentes (ej. `useRef` sin
  uso en `DriveExplorer`, `isConnected`/`listFolders`/`listExcelFiles` sin uso en el mismo
  archivo, `useEffect` sin uso en `Toast`).

### Eliminado (código muerto, no importado por nada desde antes de esta migración)

- `src/driveAuth.js` — integración de Google Drive más antigua, superada por `src/gdrive.js`
  (ahora `services/googleDrive.service.js`). Nunca fue importada por ningún componente.
- `src/excelParser.js` — parser de un solo archivo Excel, superado por
  `src/multiExcelParser.js` (ahora `services/excel.service.js`). Nunca fue importado por ningún
  componente.
- El export `downloadHTML` de `src/store.js` (duplicado no usado del `downloadHTML` real en
  `pdfGenerator.js` / `services/pdf.service.js`).

### Nota sobre archivos "puente" (compatibilidad)

Este entorno no tuvo permiso para **borrar** archivos en tu computador durante la migración
(solo para crear/reemplazar contenido), así que las rutas originales se dejaron en su lugar como
archivos que solo *re-exportan* desde la nueva ubicación (o, para el código muerto de arriba,
como un comentario explicando que ya no se usan). **Nada en el proyecto los importa hoy** — son
una red de seguridad, no parte activa de la arquitectura. Son seguros de borrar manualmente
cuando quieras dejar el árbol de archivos limpio:

```
src/store.js
src/config.js
src/firebase.js
src/gdrive.js
src/htmlGenerator.js
src/pdfGenerator.js
src/multiExcelParser.js
src/logos.js
src/style.css
src/driveAuth.js
src/excelParser.js
src/components/   (carpeta completa: los 14 archivos ahora viven en src/views/)
```

### Verificación

- `npm run build` — compila sin errores (82 módulos).
- `npm run lint` — 0 errores; solo quedan 5 advertencias preexistentes/esperadas (documentadas en
  `docs/ARCHITECTURE.md` §7 "Deuda técnica conocida"), ninguna introducida por esta migración.
