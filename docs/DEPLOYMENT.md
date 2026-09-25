# Despliegue

Esta es una **SPA estática**: `npm run build` genera archivos planos (`dist/`) que se pueden
servir desde cualquier hosting estático — no se necesita un servidor Node en producción. La app
usa `HashRouter` (rutas tipo `#/nuevo`), así que **no hace falta configurar *rewrites*** para que
las rutas internas funcionen al recargar la página; cualquier hosting estático simple sirve.

## 1. Requisitos previos

- Node.js 18+ y npm.
- (Opcional pero recomendado) un proyecto de Firebase si se va a usar autenticación real —
  actualmente el proyecto configurado es `reportes-pt-ejecutivos` (ver `src/config/firebase.js`).
- (Opcional) un Client ID de Google Cloud si se usa la integración de Google Drive
  (`src/config/app.config.js`).

## 2. Variables de entorno

Copia `.env.example` a `.env.local` (para desarrollo) y define las variables que quieras
sobreescribir. **Todas son opcionales**: si no las defines, la app usa los valores por defecto
del proyecto Firebase/Google actual, así que funciona igual sin este paso — pero en un
despliegue propio (otro cliente, otro entorno) es donde correspondería definirlas:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_GOOGLE_CLIENT_ID=...
```

En producción, defínelas en la configuración de variables de entorno de tu proveedor de hosting
(no en un archivo `.env` commiteado — Vite solo expone en el build las que empiezan con `VITE_`,
y ninguna debe ser secreta: la config web de Firebase y el OAuth Client ID de Google son
identificadores públicos por diseño, protegidos por las reglas de seguridad de Firebase/Google,
no por estar ocultos).

## 3. Build de producción

```bash
npm install
npm run build      # genera ./dist
npm run preview    # sirve ./dist localmente para verificar antes de publicar
```

`npm run lint` corre ESLint sobre todo el proyecto; conviene ejecutarlo antes de cada despliegue
(o automatizarlo en CI, ver §6).

## 4. Opción recomendada: Firebase Hosting

Como la app ya usa Firebase Auth, lo más simple es servirla desde el mismo proyecto Firebase.

```bash
npm install -g firebase-tools   # una sola vez
firebase login
firebase init hosting           # elegir el proyecto "reportes-pt-ejecutivos"
#   - Directorio público: dist
#   - Configurar como SPA (single-page app): Yes
#   - No sobreescribir index.html
firebase deploy --only hosting
```

Esto crea un `firebase.json` con algo como:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

(El `rewrite` a `index.html` es un extra de seguridad; con `HashRouter` no es estrictamente
necesario, pero no estorba.)

## 5. Alternativas: hosting estático genérico

Cualquiera de estos sirve igual de bien, ya que no se necesita configuración especial de rutas:

- **Netlify / Vercel**: conectar el repositorio, build command `npm run build`, publish directory
  `dist`. Definir las variables `VITE_*` en el panel del proyecto.
- **GitHub Pages**: publicar el contenido de `dist/` (por ejemplo con la acción
  `peaceiris/actions-gh-pages` o `actions/deploy-pages`). Como se usa `HashRouter`, no hace falta
  el truco de `404.html` que normalmente requiere GitHub Pages para SPAs.
- **Cualquier servidor estático propio** (nginx, Apache, un bucket S3 con hosting estático, etc.):
  copiar el contenido de `dist/` tal cual.

## 6. Integración continua (opcional, sugerido)

No hay CI configurado todavía. Un flujo mínimo recomendado (GitHub Actions, por ejemplo) por cada
push/PR:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

Esto detecta errores de import/build y problemas de lint antes de llegar a producción — algo que
antes de esta migración no existía en el proyecto.

## 7. Antes de un despliegue con datos reales de clientes

Ver la sección **"Deuda técnica conocida"** en [`ARCHITECTURE.md`](./ARCHITECTURE.md). En
particular: revisar las contraseñas de demo/comodín del login local antes de usar este sistema
con información real de clientes, y considerar exigir Firebase Authentication como único método
de login en ese escenario.
