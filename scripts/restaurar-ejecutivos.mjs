/**
 * scripts/restaurar-ejecutivos.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Recrea la colección `ejecutivos` cuando quedó vacía o incompleta (sin ella
 * nadie puede entrar: la app busca a cada persona por correo ahí).
 *
 * NO lleva datos en el código: lee la lista de personas de un JSON local que
 * está en .gitignore (por defecto ./ejecutivos-restaurar.json, un arreglo de
 * { id, nom, email, zona, role, workspaceId }). Solo CREA lo que falta: nunca
 * pisa una persona que ya exista en Firestore (ni por id ni por correo).
 *
 * Para no dejar a la gente "sin área", infiere lo que puede de lo que ya está
 * en Firestore: el área donde cada persona aparece en `clientes.asignaciones`,
 * el área líder si es ejecutivo de algún cliente, y el rol admin si es
 * `adminId` de un área. Muestra la tabla para que la revises (--dry-run) y
 * luego puedes ajustar cualquier cosa desde Personas.
 *
 * Uso:   node scripts/restaurar-ejecutivos.mjs --dry-run [archivo.json]
 *        node scripts/restaurar-ejecutivos.mjs [archivo.json]
 * Requiere serviceAccountKey.json (NO se sube a git). Al final deja `perfiles` al día.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const KEY = resolve(ROOT, 'serviceAccountKey.json');
const DRY = process.argv.includes('--dry-run');
const archivo = resolve(ROOT, process.argv.slice(2).find(a => !a.startsWith('--')) || 'ejecutivos-restaurar.json');

if (!existsSync(KEY)) { console.error('❌ Falta serviceAccountKey.json en la raíz del proyecto.'); process.exit(1); }
if (!existsSync(archivo)) { console.error(`❌ No encuentro ${archivo}`); process.exit(1); }
const lista = JSON.parse(readFileSync(archivo, 'utf8'));
if (!Array.isArray(lista) || !lista.length) { console.error('❌ El JSON debe ser un arreglo de personas.'); process.exit(1); }

initializeApp({ credential: cert(JSON.parse(readFileSync(KEY, 'utf8'))) });
const db = getFirestore();
const leer = async n => (await db.collection(n).get()).docs.map(d => ({ id: d.id, ...d.data() }));

const [ejsActuales, clientes, areas, workspaces] = await Promise.all([leer('ejecutivos'), leer('clientes'), leer('areas'), leer('workspaces')]);
const idsExistentes = new Set(ejsActuales.map(e => e.id));
const correosExistentes = new Set(ejsActuales.map(e => String(e.email || '').toLowerCase()));
const wsPorDefecto = workspaces[0]?.id || '';
const areaLider = areas.find(a => a.lidera === true) || areas.find(a => /atenci[oó]n|ejecutiv/i.test(a.nombre || ''));

function inferir(p) {
  const conteo = {};
  for (const c of clientes) for (const [areaId, ejId] of Object.entries(c.asignaciones || {})) if (ejId === p.id) conteo[areaId] = (conteo[areaId] || 0) + 1;
  let areaId = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  if (!areaId && clientes.some(c => c.ejId === p.id) && areaLider) areaId = areaLider.id;
  const esAdminDeArea = areas.some(a => a.adminId === p.id);
  const role = p.role === 'super_admin' ? 'super_admin' : (esAdminDeArea ? 'admin' : (p.role || 'usuario'));
  return { areaId: p.areaId || areaId, role };
}

const nuevos = [];
for (const p of lista) {
  const email = String(p.email || '').toLowerCase().trim();
  if (!p.id || !email) { console.warn(`⚠  Se omite una fila sin id o correo: ${JSON.stringify(p.nom || p)}`); continue; }
  if (idsExistentes.has(p.id) || correosExistentes.has(email)) continue;
  const { areaId, role } = inferir(p);
  nuevos.push({ id: p.id, nom: p.nom || email, email, zona: p.zona || '', role, areaId, workspaceId: p.workspaceId || wsPorDefecto, activo: p.activo !== false });
}

console.log(`${DRY ? '[simulación] ' : ''}Personas ya en Firestore: ${ejsActuales.length} · por crear: ${nuevos.length}`);
console.table(nuevos.map(n => ({ id: n.id, nombre: n.nom, correo: n.email, rol: n.role, area: areas.find(a => a.id === n.areaId)?.nombre || '(sin área)' })));

if (!DRY) {
  for (const n of nuevos) {
    const { id, ...resto } = n;
    await db.collection('ejecutivos').doc(id).create({ ...resto, updatedAt: FieldValue.serverTimestamp() });
  }
  const todas = [...ejsActuales, ...nuevos];
  for (const e of todas) {
    const email = String(e.email || '').toLowerCase().trim();
    if (!email) continue;
    await db.collection('perfiles').doc(email).set({ role: e.role || 'usuario', activo: e.activo !== false, ejId: e.id, updatedAt: FieldValue.serverTimestamp() });
  }
  const supers = todas.filter(e => e.role === 'super_admin' && e.activo !== false).map(e => e.email);
  console.log(`✔ Listo. Super admins activos: ${supers.join(', ') || 'NINGUNO'}`);
}
