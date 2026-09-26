/**
 * scripts/migrate-to-firestore.mjs
 * ─────────────────────────────────────────────────────────────────────────
 * Migración ÚNICA de los datos reales actuales (exportados desde el
 * navegador del usuario a ps_v3-export.json) hacia Firestore, incluyendo la
 * creación de cuentas REALES en Firebase Authentication para cada
 * ejecutivo — sin esto, firestore.rules (que exige request.auth != null en
 * TODAS las colecciones) rechaza cada lectura/escritura y Firestore se ve
 * vacío para siempre, aunque el código de sync ya exista.
 *
 * Decisión clave: el UID de Firebase Auth de cada ejecutivo se fija IGUAL a
 * su id local ("e0", "e5", ...). Así, todas las referencias existentes
 * (clientes.ejId, contribuciones.userId, areas.adminId, moduloConfigs keys)
 * siguen apuntando al id correcto sin tener que remapear nada.
 *
 * Uso:
 *   node scripts/migrate-to-firestore.mjs [--dry-run]
 *
 * Requiere en la raíz del proyecto:
 *   - serviceAccountKey.json   (clave privada de Firebase Admin — NO subir a git)
 *   - ps_v3-export.json        (exportado desde el navegador real, ver
 *                                scripts/exportar-datos.js / SendUserFile)
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const SERVICE_ACCOUNT_PATH = resolve(ROOT, 'serviceAccountKey.json');
const EXPORT_PATH = resolve(ROOT, 'ps_v3-export.json');
const PROJECT_ID = 'reportes-pt-ejecutivos';
const DRY_RUN = process.argv.includes('--dry-run');
const DEFAULT_PASSWORD = 'Proservis2026';

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  fail(`No se encuentra ${SERVICE_ACCOUNT_PATH}. Descárgalo en Firebase Console > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.`);
}
if (!existsSync(EXPORT_PATH)) {
  fail(`No se encuentra ${EXPORT_PATH}. Genera este archivo pegando scripts/exportar-datos.js en la consola del navegador donde usas la app.`);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
const data = JSON.parse(readFileSync(EXPORT_PATH, 'utf8'));

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  projectId: PROJECT_ID,
});

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const REAL_DOMAIN = '@proservis.com.co';

// Mapa de verdad conocida (id -> email correcto) para los 7 ids duplicados
// ya identificados en esta migración (e1..e7), tomado del registro
// histórico clientes_ejecutivos.json (borrado del repo por ser un dato
// quemado, pero su contenido en este punto puntual es la única fuente
// confiable para saber qué persona es la real detrás de cada id
// duplicado — p.ej. e1 real es Alejandra Loaiza <...@yupi.com.co>, un
// dominio de cliente, no de Proservis, así que el heurístico de dominio
// por sí solo no basta para ese caso).
const KNOWN_CORRECT_EMAIL_BY_ID = {
  e1: 'ejecutivocali.gh@yupi.com.co',
  e2: 'ejecutivo.cali6@proservis.com.co',
  e3: 'ejecutivo.girardot@proservis.com.co',
  e4: 'ejecutivo.ibague@proservis.com.co',
  e5: 'lider.operativo@proservis.com.co',
  e6: 'ejecutivo.promoambiental@proservis.com.co',
  e7: 'ejecutivo.cali2@proservis.com.co',
};

// ── Deduplicar ejecutivos con id repetido ──────────────────────────────
// El export real trae ids duplicados (p.ej. dos registros distintos con
// id "e2": uno con dominio de correo equivocado "@proservis.co" y otro
// con el dominio real "@proservis.com.co"). Es un dato corrupto ya
// presente en el DB (ver commit e526f14 "fix duplicate key errors", que
// solo parchó la UI, nunca los datos). Aquí se resuelve de una vez:
// se conserva el registro con el dominio corporativo real; si ninguno
// coincide, se conserva el que otras colecciones referencian más veces;
// el resto se descarta y se reporta.
function dedupeEjecutivos(rawEjs, clis, infs, contribuciones) {
  const refCount = {};
  const bump = (id) => { if (id) refCount[id] = (refCount[id] || 0) + 1; };
  clis.forEach(c => bump(c.ejId));
  infs.forEach(i => bump(i.ejId));
  contribuciones.forEach(c => bump(c.userId));

  const byId = new Map();
  for (const e of rawEjs) {
    if (!byId.has(e.id)) byId.set(e.id, []);
    byId.get(e.id).push(e);
  }

  const result = [];
  for (const [id, group] of byId) {
    if (group.length === 1) { result.push(group[0]); continue; }

    console.warn(`\n⚠️  Ejecutivo duplicado id=${id} (${group.length} registros):`);
    group.forEach(e => console.warn(`      - ${e.nom} <${e.email}> role=${e.role} refs=${refCount[e.id] || 0}`));

    const known = KNOWN_CORRECT_EMAIL_BY_ID[id];
    const knownMatch = known && group.filter(e => (e.email || '').toLowerCase() === known.toLowerCase());
    const realDomain = group.filter(e => (e.email || '').toLowerCase().endsWith(REAL_DOMAIN));
    let winner;
    if (knownMatch && knownMatch.length === 1) {
      winner = knownMatch[0];
    } else if (realDomain.length === 1) {
      winner = realDomain[0];
    } else {
      winner = [...group].sort((a, b) => (refCount[b.id] || 0) - (refCount[a.id] || 0))[0];
    }
    console.warn(`   ✅ Se conserva: ${winner.nom} <${winner.email}>`);
    group.filter(e => e !== winner).forEach(e => console.warn(`   ❌ Se descarta como duplicado: ${e.nom} <${e.email}>`));
    result.push(winner);
  }
  return result;
}

const ejs = dedupeEjecutivos(data.ejs || [], data.clis || [], data.infs || [], data.contribuciones || []);
// Igual que con ejecutivos: el export trae 5 clientes con id duplicado
// (c1, c2, c3, c4, c5) — algunos por reasignación de ejecutivo no
// limpiada (c1), otro por el mismo cliente con y sin logo ya subido
// (c2), y tres por datos de prueba que colisionaron con clientes reales
// (c3, c4, c5: "Industrias del Sur", "Cruz Roja Colombiana", "Mi Super
// Mercado" no son clientes reales de Proservis). Se resuelve igual: se
// prioriza el registro que coincide con el histórico conocido, y si son
// idénticos salvo por completitud (p.ej. el logo) se conserva el más
// completo.
const KNOWN_CORRECT_CLIENT_BY_ID = {
  c1: { nom: '4 PAJAROS S.A.S.', nit: '900977113', ejId: 'e8' },
  c3: { nom: 'AGECOLDA S.A.S.', nit: '890311251', ejId: 'e2' },
  c4: { nom: 'AGENCIA DE ADUANAS AGECOLDEX S.A.', nit: '800254610', ejId: 'e2' },
  c5: { nom: 'AGENCIA SEGUROS S.A.', nit: '900074589', ejId: 'e5' },
};

function dedupeClientes(rawClis) {
  const byId = new Map();
  for (const c of rawClis) {
    if (!byId.has(c.id)) byId.set(c.id, []);
    byId.get(c.id).push(c);
  }
  const result = [];
  for (const [id, group] of byId) {
    if (group.length === 1) { result.push(group[0]); continue; }

    console.warn(`\n⚠️  Cliente duplicado id=${id} (${group.length} registros):`);
    group.forEach(c => console.warn(`      - ${c.nom} nit=${c.nit || '(sin nit)'} ejId=${c.ejId} logo=${c.logo ? 'sí' : 'no'}`));

    const known = KNOWN_CORRECT_CLIENT_BY_ID[id];
    let winner = known
      ? group.find(c => c.nom === known.nom && (c.nit || '') === known.nit && c.ejId === known.ejId)
      : null;

    if (!winner) {
      const sameIdentity = group.every(c => c.nom === group[0].nom && (c.nit || '') === (group[0].nit || ''));
      winner = sameIdentity
        ? [...group].sort((a, b) => (b.logo ? 1 : 0) - (a.logo ? 1 : 0) || (b.driveFolder ? 1 : 0) - (a.driveFolder ? 1 : 0))[0]
        : group[group.length - 1];
    }

    console.warn(`   ✅ Se conserva: ${winner.nom}${winner.logo ? ' (con logo)' : ''}`);
    group.filter(c => c !== winner).forEach(c => console.warn(`   ❌ Se descarta como duplicado: ${c.nom}`));
    result.push(winner);
  }
  return result;
}

const clis = dedupeClientes(data.clis || []);
const infs = data.infs || [];
const workspaces = data.workspaces || [];
const areas = data.areas || [];
const moduloConfigs = data.moduloConfigs || {};
const contribuciones = data.contribuciones || [];

console.log('📦 Datos a migrar:');
console.log(`   Ejecutivos:     ${ejs.length}`);
console.log(`   Clientes:       ${clis.length}`);
console.log(`   Informes:       ${infs.length}`);
console.log(`   Workspaces:     ${workspaces.length}`);
console.log(`   Areas:          ${areas.length}`);
console.log(`   ModuloConfigs:  ${Object.keys(moduloConfigs).length}`);
console.log(`   Contribuciones: ${contribuciones.length}`);
if (DRY_RUN) console.log('\n⚠️  --dry-run: no se escribirá nada, solo se valida.\n');

// ── 1) Crear/verificar cuentas reales de Firebase Auth (uid = id local) ───
async function ensureAuthUser(ej) {
  const uid = ej.id;
  const email = (ej.email || '').toLowerCase().trim();
  if (!email) {
    console.warn(`   ⚠️  Ejecutivo ${uid} (${ej.nom || 'sin nombre'}) no tiene email — se omite la cuenta de Auth.`);
    return null;
  }
  try {
    const existing = await auth.getUser(uid);
    if (existing.email !== email) {
      if (!DRY_RUN) await auth.updateUser(uid, { email });
      console.log(`   ↺ Auth ${uid}: email actualizado a ${email}`);
    } else {
      console.log(`   = Auth ${uid} (${email}) ya existe`);
    }
    return uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  // Por email (por si el uid no coincide pero el correo sí existe)
  try {
    const byEmail = await auth.getUserByEmail(email);
    console.log(`   = Auth para ${email} ya existe con uid ${byEmail.uid} (distinto del id local ${uid}) — se usará ese uid.`);
    return byEmail.uid;
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  const password = (ej.password && ej.password.trim()) || DEFAULT_PASSWORD;
  console.log(`   + Auth ${uid}: creando cuenta real para ${email}`);
  if (!DRY_RUN) {
    await auth.createUser({ uid, email, password, displayName: ej.nom || undefined });
  }
  return uid;
}

async function migrateAuthUsers() {
  console.log('\n🔐 Cuentas de Firebase Authentication:');
  const uidByLocalId = new Map();
  for (const ej of ejs) {
    const uid = await ensureAuthUser(ej);
    uidByLocalId.set(ej.id, uid || ej.id);
  }
  return uidByLocalId;
}

// ── 2) Escribir Firestore en batches (límite 500 ops/batch) ───────────────
let batch = db.batch();
let ops = 0;
const MAX_OPS = 450;
const timestamp = FieldValue.serverTimestamp();

async function setDoc(collection, id, docData) {
  if (!id) { console.warn(`   ⚠️  Documento sin id en ${collection}, se omite:`, docData); return; }
  if (!DRY_RUN) {
    batch.set(db.collection(collection).doc(String(id)), { ...docData, migratedAt: timestamp }, { merge: true });
  }
  ops++;
  if (ops >= MAX_OPS && !DRY_RUN) {
    await batch.commit();
    console.log(`   ✅ batch de ${ops} escrituras confirmado`);
    batch = db.batch();
    ops = 0;
  }
}

async function migrateFirestoreData(uidByLocalId) {
  console.log('\n📝 Escribiendo colecciones en Firestore...');

  for (const w of workspaces) await setDoc('workspaces', w.id, w);
  for (const a of areas) await setDoc('areas', a.id, a);

  for (const ej of ejs) {
    const uid = uidByLocalId.get(ej.id) || ej.id;
    const { id, ...rest } = ej;
    await setDoc('ejecutivos', uid, rest);
  }

  for (const c of clis) await setDoc('clientes', c.id, c);
  for (const i of infs) await setDoc('informes', i.id, i);
  for (const ct of contribuciones) await setDoc('contribuciones', ct.id, ct);

  for (const [key, cfg] of Object.entries(moduloConfigs)) {
    await setDoc('moduloConfigs', key, cfg);
  }

  if (ops > 0 && !DRY_RUN) {
    await batch.commit();
    console.log(`   ✅ batch final de ${ops} escrituras confirmado`);
  }
}

(async () => {
  try {
    const uidByLocalId = await migrateAuthUsers();
    await migrateFirestoreData(uidByLocalId);
    console.log(DRY_RUN ? '\n✅ Dry-run completo, sin errores.' : '\n🎉 Migración completa. Revisa la consola de Firestore.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error fatal durante la migración:', err);
    process.exit(1);
  }
})();
