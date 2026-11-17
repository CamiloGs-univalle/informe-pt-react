# Informe de QA y UX — Plataforma de informes Proservis

Octubre 2026. Revisión hecha en tres papeles: **usuario final exigente**, **tester de software** y **diseñador UX/UI**, recorriendo la app con cada rol (super admin, admin, ejecutivo líder y trabajador de área) en escritorio (1440 px) y celular (390 px), con datos de prueba sintéticos.

## 1. Resumen

La app tenía buenas ideas (flujo colaborativo por áreas, módulos configurables, informe ejecutivo) pero muchas pantallas prometían algo que no hacían, mostraban a todos lo mismo y se veían desordenadas. Se corrigieron los hallazgos de abajo; el criterio fue: **todo botón hace algo o está deshabilitado diciendo por qué, todo texto se lee completo, todo número lleva formato colombiano, y cada rol ve solo lo suyo.**

Verificación: `npm run build` pasa; `eslint` sin errores; más de 30 comprobaciones automatizadas de flujo (navegador real) pasan en los cuatro roles; barrido de pantallas sin texto cortado, sin fuentes menores de 11 px y sin desbordes horizontales en 390 px.

## 2. Hallazgos y qué se hizo

### Críticos (rompían el uso o la confianza)

| # | Qué pasaba | Qué se hizo |
|---|---|---|
| 1 | **Datos de acceso en el código**: panel SortTime con credenciales y una "extracción" simulada; contraseñas en el README, en scripts de carga y guardadas en cada persona. | Panel retirado (queda un enlace configurable `VITE_SORTTIME_URL`); ya no se guardan ni cargan contraseñas; el acceso es solo por Firebase Auth. |
| 2 | **Botón "Borrar todo + crear super admin"** con contraseña fija, a un clic de borrar producción. | Retirado. «Datos y cargas» ofrece cargas con vista previa, respaldo y sincronización. |
| 3 | **IDs repetidos** al crear varios clientes/personas a la vez (carga masiva): un registro pisaba a otro. | Generador de ids único (`utils/ids.js`). La carga masiva pasa por los mismos modelos que el resto de la app (antes escribía a Firestore por su lado). |
| 4 | **Editar un cliente borraba sus asignaciones por área**; borrar clientes/áreas/espacios dejaba informes, aportes y configuraciones huérfanos. | La edición conserva las asignaciones; los borrados son en cascada y piden confirmar diciendo qué se perderá. |
| 5 | **Todos veían todo**: menú y datos iguales para trabajador, líder y admin; el super admin veía "Mis contribuciones — Selección" de un área al azar. | Alcance por persona (`models/Alcance.js`): menú, rutas y datos por capacidad; el super admin elige el área o usa «Ver como». |
| 6 | **El informe HTML no escapaba texto libre**: un `<` en una observación rompía el diseño o inyectaba HTML. | Todo texto escrito por personas se escapa. |
| 7 | **El PPTX ignoraba los módulos apagados**, no incluía capacitación/clima/facturación, mostraba textos de plantilla ("Logo del cliente", "esta diapositiva se utiliza solo si…") y fallaba si un RQ no tenía código. | Respeta los módulos activos, suma las tres diapositivas, quita textos de plantilla y ya no falla. |

### Altos (la función existía pero estaba mal ejecutada)

| # | Qué pasaba | Qué se hizo |
|---|---|---|
| 8 | Los avisos (toasts) no se veían; `alert()`/`confirm()` del navegador para borrar. | Sistema propio de avisos y confirmaciones con consecuencias en español. |
| 9 | «Mis contribuciones» y el tablero eran tarjetas que no llevaban a un formulario real. | Formularios por módulo (los mismos del líder), borrador, enviar/retirar, validar o devolver con motivo (mínimo 5 letras), historial y calidad. |
| 10 | Guardar el informe final de un cliente/mes ya existente lo duplicaba. | Pide confirmar y reemplaza. |
| 11 | Listas cortadas: clientes limitados a 30, áreas con ids quemados (`selId`, `sstId`). | Paginación real; áreas dinámicas leídas de Firestore; líder y responsable por área en una sola pantalla. |
| 12 | «Espacios y áreas» no permitía definir quién lidera el informe final (se adivinaba por el nombre del área). | Casilla «Esta área lidera el informe final» + módulos y administrador por área. |
| 13 | El mes "actual" se calculaba en UTC (a las 7 p. m. ya era el mes siguiente). | Hora local (`periodoActual`). |
| 14 | Sin conexión, la app mostraba pantallas vacías o borraba la caché. | Banner claro "Sin conexión" con Reintentar; no se sincroniza nada hasta cargar bien del servidor. |

### Medios y de diseño

- **Texto cortado con "…"** (nombres de clientes, personas, áreas, módulos, correos): ahora se ajusta a varias líneas.
- **Fuentes de 9–10 px** subidas a 11–12 px (incluidos gráficos y diapositivas).
- **Números sin punto de miles** y decimales con punto: formato es-CO en pantallas, informe HTML y PPTX.
- **`<input type="month">` nativo** (distinto en cada navegador): selector propio ‹ Mes Año ›.
- Encabezado desordenado (rol y correo en dos sitios) y roto en celular: rehecho; en 390 px el «Ver como» pasa a segunda fila.
- Páginas sin estructura común: `PageHeader`, KPIs, tablas y chips unificados; estados vacíos que dicen qué hacer.
- Carga inicial de 2,9 MB → 0,86 MB (pantallas y librerías de PDF/PPTX bajo demanda).
- Código muerto y duplicado eliminado (`Toast`, `notify`, `style.css`, `logos.js`, `RequireRole`, `PendingGrid`, `firestore.service`, `SortTimePanel`).

## 3. Recorrido por rol (todo verificado en navegador)

- **Trabajador de área**: ve solo sus clientes y sus áreas; intenta enviar vacío (lo impide con aviso), guarda borrador, envía con confirmación y el aporte queda «completado».
- **Ejecutivo líder**: menú sin administración; tablero con sus clientes; valida un aporte; devuelve otro (exige motivo, queda «rechazado» con contador); vista previa; wizard manual por todos los módulos hasta guardar; abre el informe en Guardados; apaga un módulo y se guarda.
- **Admin**: solo ve a su equipo y su área; no puede crear super admin ni usar áreas ajenas; Mi equipo → «Editar persona» abre la ficha correcta; `/espacios` y `/admin-data` bloqueados.
- **Super admin**: crea/edita/desactiva/elimina personas (correo duplicado rechazado); asigna líder a un cliente sin tocar sus áreas; crea un área que lidera con módulos, rechaza nombre repetido y la elimina con confirmación; importa CSV de clientes (1 nuevo, 1 actualizado, 1 con error) y al repetir el archivo no duplica; importa personas sin contraseñas; descarga respaldo; «Ver como» un líder cambia el menú y vuelve.

## 4. Pendientes y riesgos (decisiones suyas)

1. **Reglas de Firestore.** Las reglas actuales cierran la base al personal verificado de Proservis (dominio), pero no distinguen roles: la app limita por rol, la base no. Para lo segundo hace falta *custom claims* o una colección de perfiles por correo. Hoy los ids de documento (`e1…`) no coinciden con el `uid` de Auth y las reglas solo dejan escribir `ejecutivos` al super admin: decidir si los admins pueden crear personas (la pantalla ya se lo permite) y ajustar reglas o usar *custom claims*.
2. **Historial de git.** El archivo `clientes_ejecutivos.json` contenía una contraseña compartida: sigue en el historial. Conviene rotarla y limpiar el historial.
3. **Personas nuevas.** Para entrar necesitan cuenta en Firebase Authentication con el mismo correo (entrar con Google la crea). Registrarlas en «Personas» no crea la cuenta.
4. **Datos sensibles locales.** Borrar del equipo el export de datos reales (`ps_v3-export.json`) y no subirlo.
5. **Textos de ayuda específicos de un cliente.** Algunas ayudas de módulos (p. ej. "Nacional, Cauca, Santander" en Tasa de accidentalidad) son específicas de un cliente; conviene hacerlas configurables.
6. **PPTX** sigue siendo una plantilla fija de 10 pulgadas sobre lienzo ancho; si se quiere identidad más fuerte, rediseñarla por separado.
