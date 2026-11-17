/**
 * services/firebaseSync.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Sincroniza el DB local (localStorage, ver models/db.js) con Firestore.
 * - Al arrancar: carga todo desde Firestore hacia el DB local (fuente real).
 * - En cada saveDB(): re-sincroniza TODA la colección afectada hacia
 *   Firestore (crea, actualiza y borra lo que ya no exista localmente).
 *
 * Por qué "resync completo" y no un registro fino de qué cambió: los
 * modelos (Cliente.js, Ejecutivo.js, Informe.js, Contribucion.js,
 * Workspace.js, ModuloConfig.js) llaman todos a saveDB() sin decir qué
 * registro cambió — antes existía una cola scheduleWrite()/pendingWrites
 * pensada para eso, pero NADA la llamaba nunca (bug real, confirmado por
 * auditoría: cero escrituras llegaban a Firestore desde la UI, solo la
 * carga inicial funcionaba). En vez de tocar los 6 modelos para que cada
 * uno reporte su propio diff, se compara el snapshot local actual contra
 * el último snapshot sincronizado por colección: lo que ya no está se
 * borra en Firestore, lo que sigue estando se sube (upsert). Con ~150
 * documentos totales esto es barato y, sobre todo, no puede quedar
 * desincronizado silenciosamente como el diseño anterior.
 */
import { DB, STORAGE_KEY } from '../models/db';
import { db } from '../config/firebase';
import {
  collection, doc, getDocsFromServer, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';

const COLLECTIONS = {
  ejecutivos: 'ejecutivos',
  clientes: 'clientes',
  informes: 'informes',
  workspaces: 'workspaces',
  areas: 'areas',
  contribuciones: 'contribuciones',
  moduloConfigs: 'moduloConfigs',
};

const LOAD_TIMEOUT_MS = 10000;
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore no respondió a tiempo')), ms)),
  ]);
}

let syncEnabled = false;
let writeTimer = null;
let lastSyncError = null;

// Último conjunto de ids que se sabe que existen en Firestore, por
// colección — se usa para detectar borrados. Se siembra en
// loadFromFirestore() con lo que ya había, así que un primer saveDB()
// nunca borra por error algo que nunca se cargó localmente.
const lastSyncedIds = {
  ejecutivos: new Set(),
  clientes: new Set(),
  informes: new Set(),
  workspaces: new Set(),
  areas: new Set(),
  contribuciones: new Set(),
  moduloConfigs: new Set(),
};

// Contenido (sin updatedAt) de cada documento tal como quedó en Firestore.
// Sirve para escribir SOLO lo que cambió: antes cada saveDB() re-subía toda la
// base, y eso chocaba con las reglas por rol (un "usuario" no puede escribir
// ejecutivos/áreas/espacios, aunque no los hubiera tocado).
const lastSyncedJson = {
  ejecutivos: new Map(), clientes: new Map(), informes: new Map(),
  workspaces: new Map(), areas: new Map(), contribuciones: new Map(), moduloConfigs: new Map(),
};
// Correo con el que cada ejecutivo está registrado en `perfiles` (para borrar/renombrar).
const perfilEmailById = new Map();

function estable(v) {
  if (Array.isArray(v)) return `[${v.map(estable).join(',')}]`;
  if (v && typeof v === 'object') {
    if (typeof v.toMillis === 'function') return String(v.toMillis());
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${estable(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v === undefined ? null : v);
}
function huella(obj) {
  const { id: _id, updatedAt: _u, ...rest } = obj || {};
  return estable(rest);
}

const emailPerfil = e => String(e?.email || '').toLowerCase().trim();

/** perfiles/<correo>: lo que firestore.rules usa para conocer el rol de quien escribe. */
async function syncPerfil(ej) {
  const email = emailPerfil(ej);
  const viejo = perfilEmailById.get(String(ej.id));
  if (viejo && viejo !== email) {
    try { await deleteDoc(doc(db, 'perfiles', viejo)); } catch (e) { console.error(`[FirebaseSync] perfiles/${viejo}:`, e); }
    perfilEmailById.delete(String(ej.id));
  }
  if (!email) return;
  await setDoc(doc(db, 'perfiles', email), {
    role: ej.role || 'usuario', activo: ej.activo !== false, ejId: String(ej.id), updatedAt: serverTimestamp(),
  });
  perfilEmailById.set(String(ej.id), email);
}

function currentArraysByCollection() {
  return {
    ejecutivos: DB.ejs,
    clientes: DB.clis,
    informes: DB.infs,
    workspaces: DB.workspaces,
    areas: DB.areas,
    contribuciones: DB.contribuciones,
    // moduloConfigs es un objeto { [key]: cfg }, no un arreglo — se adapta abajo.
  };
}

async function syncArrayCollection(label) {
  const items = currentArraysByCollection()[label] || [];
  const currentIds = new Set(items.filter(x => x && x.id).map(x => String(x.id)));
  const previousIds = lastSyncedIds[label];
  const hechos = lastSyncedJson[label];

  const toDelete = [...previousIds].filter(id => !currentIds.has(id));
  await Promise.all(toDelete.map(async id => {
    try {
      await deleteDoc(doc(db, COLLECTIONS[label], id));
      hechos.delete(id);
      if (label === 'ejecutivos' && perfilEmailById.has(id)) {
        await deleteDoc(doc(db, 'perfiles', perfilEmailById.get(id)));
        perfilEmailById.delete(id);
      }
    } catch (e) {
      console.error(`[FirebaseSync] Error borrando ${label}/${id}:`, e);
    }
  }));

  await Promise.all(items.filter(x => x && x.id).map(async item => {
    const { id, ...rest } = item;
    const key = String(id);
    const h = huella(item);
    if (hechos.get(key) === h) return; // sin cambios: no se escribe
    try {
      await setDoc(doc(db, COLLECTIONS[label], key), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
      if (label === 'ejecutivos') await syncPerfil(item);
      hechos.set(key, h);
    } catch (e) {
      console.error(`[FirebaseSync] Error guardando ${label}/${id}:`, e);
    }
  }));

  lastSyncedIds[label] = currentIds;
}

async function syncModuloConfigs() {
  const cfgs = DB.moduloConfigs || {};
  const currentKeys = new Set(Object.keys(cfgs));
  const previousKeys = lastSyncedIds.moduloConfigs;

  const toDelete = [...previousKeys].filter(k => !currentKeys.has(k));
  await Promise.all(toDelete.map(async key => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.moduloConfigs, key));
      lastSyncedJson.moduloConfigs.delete(key);
    } catch (e) {
      console.error(`[FirebaseSync] Error borrando moduloConfigs/${key}:`, e);
    }
  }));

  const hechos = lastSyncedJson.moduloConfigs;
  await Promise.all(Object.entries(cfgs).map(async ([key, cfg]) => {
    const h = huella(cfg);
    if (hechos.get(key) === h) return;
    try {
      await setDoc(doc(db, COLLECTIONS.moduloConfigs, key), { ...cfg, updatedAt: serverTimestamp() }, { merge: true });
      hechos.set(key, h);
    } catch (e) {
      console.error(`[FirebaseSync] Error guardando moduloConfigs/${key}:`, e);
    }
  }));

  lastSyncedIds.moduloConfigs = currentKeys;
}

async function flushWrites() {
  if (!syncEnabled) {
    console.warn('[FirebaseSync] flushWrites called but sync not enabled');
    return;
  }
  writeTimer = null;
  try {
    await Promise.all([
      syncArrayCollection('ejecutivos'),
      syncArrayCollection('clientes'),
      syncArrayCollection('informes'),
      syncArrayCollection('workspaces'),
      syncArrayCollection('areas'),
      syncArrayCollection('contribuciones'),
      syncModuloConfigs(),
    ]);
    lastSyncError = null;
    console.log('[FirebaseSync] Sincronizado con Firestore');
  } catch (error) {
    lastSyncError = error;
    console.error('[FirebaseSync] Falló la sincronización:', error);
    throw error; // Re-lanzar para que el caller se entere
  }
}

// Mantiene el nombre histórico para no tener que tocar db.js: saveDB()
// llama a enableFirebaseSync() y luego a esto.
export function enableFirebaseSync() {
  if (syncEnabled) return;
  syncEnabled = true;
  console.log('[FirebaseSync] Habilitado — los cambios locales se sincronizan a Firestore');
}

export function disableFirebaseSync() {
  syncEnabled = false;
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
}

export async function forceSync() {
  // Limpia cualquier timer pendiente y ejecuta flush directamente
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  await flushWrites();
}

// ── Carga inicial: Firestore → DB local ────────────────────────────────
export async function loadFromFirestore() {
  console.log('[FirebaseSync] Cargando datos desde Firestore...');

  try {
    // getDocsFromServer (y no getDocs): sin conexión getDocs devuelve un
    // snapshot VACÍO desde caché "con éxito", y eso borraba los datos locales.
    // Aquí, si el servidor no responde, la promesa falla y db.js conserva la caché.
    const fromServer = name => withTimeout(getDocsFromServer(collection(db, name)), LOAD_TIMEOUT_MS);
    const [ejsSnap, clisSnap, infsSnap, wsSnap, areasSnap, ctSnap, mcSnap] = await Promise.all([
      fromServer(COLLECTIONS.ejecutivos),
      fromServer(COLLECTIONS.clientes),
      fromServer(COLLECTIONS.informes),
      fromServer(COLLECTIONS.workspaces),
      fromServer(COLLECTIONS.areas),
      fromServer(COLLECTIONS.contribuciones),
      fromServer(COLLECTIONS.moduloConfigs),
    ]);

    const toArr = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

    DB.ejs = toArr(ejsSnap);
    DB.clis = toArr(clisSnap).map(c => ({ asignaciones: c.asignaciones || {}, ...c }));
    DB.infs = toArr(infsSnap);
    DB.workspaces = toArr(wsSnap);
    DB.areas = toArr(areasSnap).map(a => ({ modulos: [], adminId: null, descripcion: '', ...a }));
    DB.contribuciones = toArr(ctSnap);
    DB.moduloConfigs = {};
    mcSnap.docs.forEach(d => { DB.moduloConfigs[d.id] = d.data(); });

    // Siembra el snapshot "conocido" con lo que acaba de venir de Firestore,
    // para que el primer saveDB() no confunda "nunca sincronizado" con
    // "borrado".
    lastSyncedIds.ejecutivos = new Set(DB.ejs.map(e => String(e.id)));
    lastSyncedIds.clientes = new Set(DB.clis.map(c => String(c.id)));
    lastSyncedIds.informes = new Set(DB.infs.map(i => String(i.id)));
    lastSyncedIds.workspaces = new Set(DB.workspaces.map(w => String(w.id)));
    lastSyncedIds.areas = new Set(DB.areas.map(a => String(a.id)));
    lastSyncedIds.contribuciones = new Set(DB.contribuciones.map(c => String(c.id)));
    lastSyncedIds.moduloConfigs = new Set(Object.keys(DB.moduloConfigs));

    const sembrar = (label, arr) => {
      lastSyncedJson[label] = new Map(arr.filter(x => x && x.id).map(x => [String(x.id), huella(x)]));
    };
    sembrar('ejecutivos', DB.ejs); sembrar('clientes', DB.clis); sembrar('informes', DB.infs);
    sembrar('workspaces', DB.workspaces); sembrar('areas', DB.areas); sembrar('contribuciones', DB.contribuciones);
    lastSyncedJson.moduloConfigs = new Map(Object.entries(DB.moduloConfigs).map(([k, v]) => [k, huella(v)]));
    perfilEmailById.clear();
    DB.ejs.forEach(e => { if (emailPerfil(e)) perfilEmailById.set(String(e.id), emailPerfil(e)); });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));

    console.log(`[FirebaseSync] Cargado: ${DB.ejs.length} ejecutivos, ${DB.clis.length} clientes, ${DB.infs.length} informes, ${DB.workspaces.length} workspaces, ${DB.areas.length} areas, ${DB.contribuciones.length} contribuciones`);

    enableFirebaseSync();
    return true;
  } catch (error) {
    console.error('[FirebaseSync] Falló la carga desde Firestore:', error);
    return false;
  }
}

export function getSyncStatus() {
  return {
    enabled: syncEnabled,
    lastError: lastSyncError ? String(lastSyncError.message || lastSyncError) : null,
    localStorageSize: JSON.stringify(DB).length,
  };
}
