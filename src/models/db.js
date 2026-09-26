/**
 * db.js
 * ─────────────────────────────────────────────────────────────────────────
 * Low-level persistence layer - localStorage cache only.
 * 
 * NO SEED DATA IN CODE. All data comes from Firebase Firestore.
 * On startup: loads from Firestore → localStorage
 * On writes: localStorage → schedules Firestore sync
 * 
 * If Firestore is empty, the first super_admin creates data via UI.
 */
export const STORAGE_KEY = 'ps_v3';

// NO DEFAULT DATA - empty arrays only
const DEFAULT_WORKSPACES = [];
const DEFAULT_AREAS = [];
const DEFAULT_EJS = [];
const DEFAULT_CLIS = [];

/**
 * The single in-memory "database" object. Exported by reference so model
 * modules can read/mutate its arrays directly and call `saveDB()` to persist.
 */
export const DB = { ejs: [], clis: [], infs: [], workspaces: [], areas: [], moduloConfigs: {}, contribuciones: [] };

let firebaseSync = null;

async function getFirebaseSync() {
  if (!firebaseSync) {
    const mod = await import('../services/firebaseSync.service');
    firebaseSync = mod;
  }
  return firebaseSync;
}

/** Persists the current `DB` snapshot to localStorage and schedules Firestore sync. */
export function saveDB() {
  try {
    const data = JSON.stringify(DB);
    localStorage.setItem(STORAGE_KEY, data);
    try { window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: data })); } catch {}
    const check = localStorage.getItem(STORAGE_KEY);
    if (!check || JSON.parse(check).ejs.length !== DB.ejs.length) console.warn('saveDB verificación fallida');
  } catch (e) { console.error('saveDB error', e); }

  // Schedule async Firestore sync
  if (firebaseSync?.enableFirebaseSync) {
    firebaseSync.enableFirebaseSync();
    scheduleFirestoreWrites();
  }
}

function scheduleFirestoreWrites() {
  if (window._fsWriteTimer) clearTimeout(window._fsWriteTimer);
  window._fsWriteTimer = setTimeout(async () => {
    const sync = await getFirebaseSync();
    if (sync?.forceSync) await sync.forceSync();
  }, 500);
}

function readFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      DB.ejs = p.ejs || [];
      DB.clis = (p.clis || []).map(c => ({ asignaciones: {}, ...c, asignaciones: c.asignaciones || {} }));
      DB.infs = p.infs || [];
      DB.workspaces = p.workspaces || [];
      DB.areas = (p.areas || []).map(a => ({ modulos: [], adminId: null, descripcion: '', ...a }));
      DB.moduloConfigs = p.moduloConfigs || {};
      DB.contribuciones = p.contribuciones || [];
    }
  } catch (e) { /* ignore corrupt storage */ }
}

// NO migrateAndSeed - NO hardcoded defaults, NO demo data generation
// Data comes from Firebase. If empty, super_admin creates via UI.

export async function loadDB() {
  // Load from Firestore (source of truth)
  const sync = await getFirebaseSync();
  const loaded = await sync.loadFromFirestore();
  
  if (!loaded) {
    // Fallback: localStorage only (offline mode)
    readFromStorage();
    saveDB();
  } else {
    // Data loaded from Firestore, ensure localStorage matches
    saveDB();
  }
}

// Auto-load on module import
loadDB();