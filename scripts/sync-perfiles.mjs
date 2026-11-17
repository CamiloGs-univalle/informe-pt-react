/**
 * scripts/sync-perfiles.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Crea/actualiza la colección `perfiles` a partir de `ejecutivos`.
 *
 * Por qué existe: firestore.rules necesita saber el rol de quien escribe, pero
 * las reglas no pueden hacer consultas y los ids de `ejecutivos` (e1, e2…) no
 * son el uid de Firebase Auth. Por eso cada persona tiene además un documento
 * `perfiles/<correo en minúsculas>` con { role, activo, ejId }, que las reglas
 * leen con el correo del token. La app lo mantiene sola (firebaseSync.service)
 * cuando alguien crea/edita/borra personas; este script solo hace la carga
 * inicial (y sirve para reparar si algo se desincroniza).
 *
 * Uso:   node scripts/sync-perfiles.mjs [--dry-run]
 * Requiere serviceAccountKey.json en la raíz (NO se sube a git).
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const KEY = resolve(ROOT, 'serviceAccountKey.json');
const DRY = process.argv.includes('--dry-run');

if (!existsSync(KEY)) { console.error('❌ Falta serviceAccountKey.json en la raíz del proyecto.'); process.exit(1); }
initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) });
const db = getFirestore();

const ejs = await db.collection('ejecutivos').get();
const esperados = new Map();
for (const d of ejs.docs) {
  const e = d.data();
  const email = String(e.email || '').toLowerCase().trim();
  if (!email) { console.warn(`⚠  ${d.id} (${e.nom || 'sin nombre'}) no tiene correo: se omite.`); continue; }
  esperados.set(email, { role: e.role || 'usuario', activo: e.activo !== false, ejId: d.id });
}

const actuales = await db.collection('perfiles').get();
let creados = 0, actualizados = 0, borrados = 0;

for (const [email, p] of esperados) {
  const previo = actuales.docs.find(x => x.id === email)?.data();
  if (previo && previo.role === p.role && previo.activo === p.activo && previo.ejId === p.ejId) continue;
  previo ? actualizados++ : creados++;
  if (!DRY) await db.collection('perfiles').doc(email).set({ ...p, updatedAt: FieldValue.serverTimestamp() });
}
for (const d of actuales.docs) {
  if (esperados.has(d.id)) continue;
  borrados++;
  if (!DRY) await d.ref.delete();
}

console.log(`${DRY ? '[simulación] ' : ''}perfiles → creados ${creados}, actualizados ${actualizados}, borrados ${borrados}, total ${esperados.size}`);
const supers = [...esperados].filter(([, p]) => p.role === 'super_admin' && p.activo).map(([m]) => m);
console.log(`Super admins activos: ${supers.join(', ') || 'NINGUNO (¡revisa roles!)'}`);
