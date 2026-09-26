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
  collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { seedIfEmpty } from './firestore.service';

const COLLECTIONS = {
  ejecutivos: 'ejecutivos',
  clientes: 'clientes',
  informes: 'informes',
  workspaces: 'workspaces',
  areas: 'areas',
  contribuciones: 'contribuciones',
  moduloConfigs: 'moduloConfigs',
};

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

  const toDelete = [...previousIds].filter(id => !currentIds.has(id));
  await Promise.all(toDelete.map(async id => {
    try {
      await deleteDoc(doc(db, COLLECTIONS[label], id));
    } catch (e) {
      console.error(`[FirebaseSync] Error borrando ${label}/${id}:`, e);
    }
  }));

  await Promise.all(items.filter(x => x && x.id).map(async item => {
    const { id, ...rest } = item;
    try {
      await setDoc(doc(db, COLLECTIONS[label], String(id)), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
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
    } catch (e) {
      console.error(`[FirebaseSync] Error borrando moduloConfigs/${key}:`, e);
    }
  }));

  await Promise.all(Object.entries(cfgs).map(async ([key, cfg]) => {
    try {
      await setDoc(doc(db, COLLECTIONS.moduloConfigs, key), { ...cfg, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error(`[FirebaseSync] Error guardando moduloConfigs/${key}:`, e);
    }
  }));

  lastSyncedIds.moduloConfigs = currentKeys;
}

async function flushWrites() {
  if (!syncEnabled) return;
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
  }
}

function scheduleWrite() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flushWrites, 1000);
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
  scheduleWrite();
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  await flushWrites();
}

// ── Carga inicial: Firestore → DB local ────────────────────────────────
export async function loadFromFirestore() {
  console.log('[FirebaseSync] Cargando datos desde Firestore...');

  try {
    await seedIfEmpty();

    const [ejsSnap, clisSnap, infsSnap, wsSnap, areasSnap, ctSnap, mcSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.ejecutivos)),
      getDocs(collection(db, COLLECTIONS.clientes)),
      getDocs(collection(db, COLLECTIONS.informes)),
      getDocs(collection(db, COLLECTIONS.workspaces)),
      getDocs(collection(db, COLLECTIONS.areas)),
      getDocs(collection(db, COLLECTIONS.contribuciones)),
      getDocs(collection(db, COLLECTIONS.moduloConfigs)),
    ]);

    const toArr = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

    DB.ejs = toArr(ejsSnap);
    DB.clis = toArr(clisSnap).map(c => ({ asignaciones: {}, ...c, asignaciones: c.asignaciones || {} }));
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
