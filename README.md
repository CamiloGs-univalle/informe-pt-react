# Informe PT — Proservis

Portal de gestión de informes mensuales de clientes para **Proservis Temporales**: cada
ejecutivo genera un informe mensual por cliente (Headcount, Selección, Rotación, SST, Nómina y
registro fotográfico), a partir de Excel subidos manualmente o traídos directo desde Google
Drive, y lo exporta como HTML o PDF.

## Stack

- **React 19** + **Vite** (SPA, sin backend propio).
- **react-router-dom** (`HashRouter`) para el enrutamiento.
- **Firebase Authentication** (con *fallback* a un login local/demo si no está disponible).
- **`xlsx`** para leer los Excel de los clientes.
- **`html2pdf.js`** para exportar el informe a PDF desde el navegador.
- Persistencia en **`localStorage`** (no hay base de datos ni servidor propio) — ver
  [`docs/MODEL.md`](docs/MODEL.md).

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

Otros comandos:

```bash
npm run build       # build de producción en ./dist
npm run preview     # sirve ./dist localmente
npm run lint        # ESLint sobre todo el proyecto
```

La app funciona sin configuración adicional (usa los valores por defecto del proyecto Firebase
`reportes-pt-ejecutivos`). Para sobreescribirlos, copia `.env.example` a `.env.local` — ver
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

**Accesos demo** (visibles también en la propia pantalla de login):

| Rol | Email | Contraseña |
|---|---|---|
| Super Admin | `camilo.garcia@proservis.co` | `Proservis2026` |
| Administrador | `agomez@proservis.co` | `Proservis2026` |
| Usuario | `dperez@proservis.co` | `Proservis2026` |

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura por capas (modelos,
  controladores, servicios, vistas), diagramas y decisiones de diseño.
- [`docs/MODEL.md`](docs/MODEL.md) — entidades, relaciones y esquema de roles/permisos.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — cómo desplegar (Firebase Hosting u otro estático).
- [`CHANGELOG.md`](CHANGELOG.md) — qué cambió en la migración a esta arquitectura.

## Estructura del proyecto

```
src/
├── models/        Acceso a datos + reglas de negocio por entidad
├── controllers/    Orquestación de casos de uso (login, reportes, armado de informes)
├── services/       Integraciones externas (Google Drive, Excel, PDF, HTML del informe)
├── views/          Componentes React (pages, layout, common)
├── routes/         Rutas + control de acceso por rol
├── config/         Firebase y configuración de la app
├── utils/          Helpers puros (formato, notificaciones)
└── assets/         Logos y estilos
```

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para el detalle de cada carpeta.

## Roles

| Rol | Puede |
|---|---|
| `usuario` | Ver sus clientes, generar informes, configurar sus módulos, ver su historial |
| `admin` | Todo lo de `usuario` + gestionar personas de su equipo, asignar clientes, ver avance mensual |
| `super_admin` | Todo lo anterior + crear espacios/áreas, suplantar a cualquier ejecutivo |
