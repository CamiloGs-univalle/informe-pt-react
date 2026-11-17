// Genera public/logos/clientes/manifest.json: { "<NIT>": "<archivo>" } a partir de los
// archivos "<NIT> - <NOMBRE>.<ext>" que haya en esa carpeta. Se ejecuta solo antes de
// `npm run dev` y `npm run build`; para agregar un logo basta con dejar el archivo ahí.
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const dir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'logos', 'clientes');
mkdirSync(dir, { recursive: true });
const manifest = {};
for (const f of readdirSync(dir)) {
  const m = f.match(/^(\d+)\s*-\s*.+\.(jpe?g|png|webp|svg)$/i);
  if (m) manifest[m[1]] = f;
}
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[logos] ${Object.keys(manifest).length} logos indexados`);
