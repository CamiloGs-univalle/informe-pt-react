/**
 * db.js
 * ─────────────────────────────────────────────────────────────────────────
 * Low-level persistence layer - localStorage cache + Firestore sync.
 * 
 * NO SEED DATA IN CODE. All data comes from Firebase Firestore.
 * On startup: loads from Firestore → localStorage
 * On writes: localStorage → schedules Firestore sync
 * 
 * If Firestore is empty, the first super_admin creates data via UI.
 */
export const STORAGE_KEY = 'ps_v3';

// NO DEFAULT DATA - empty arrays only
const _DEFAULT_WORKSPACES = [];
const _DEFAULT_AREAS = [];
const _DEFAULT_EJS = [];
const _DEFAULT_CLIS = [];

/**
 * The single in-memory "database" object. Exported by reference so model
 * modules can read/mutate its arrays directly and call `saveDB()` to persist.
 */
export const DB = { 
  ejs: [], 
  clis: [], 
  infs: [], 
  workspaces: [], 
  areas: [], 
  moduloConfigs: {}, 
  contribuciones: [] 
};

// Firebase sync module - loaded eagerly at startup
let firebaseSync = null;
let firebaseSyncPromise = null;

/** Loads firebaseSync module immediately on import */
async function loadFirebaseSync() {
  if (firebaseSync) return firebaseSync;
  if (firebaseSyncPromise) return firebaseSyncPromise;
  
  firebaseSyncPromise = (async () => {
    try {
      const mod = await import('../services/firebaseSync.service');
      firebaseSync = mod;
      console.log('[DB] firebaseSync module loaded');
      return mod;
    } catch (error) {
      console.error('[DB] Failed to load firebaseSync:', error);
      firebaseSyncPromise = null;
      throw error;
    }
  })();
  
  return firebaseSyncPromise;
}

// Load firebaseSync immediately (don't await here, but start the promise)
loadFirebaseSync();

/** Persists the current `DB` snapshot to localStorage and fire-and-forget syncs to Firestore. */
export function saveDB() {
  try {
    const data = JSON.stringify(DB);
    localStorage.setItem(STORAGE_KEY, data);
    try { 
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: data })); 
    } catch {}
    const check = localStorage.getItem(STORAGE_KEY);
    if (!check || JSON.parse(check).ejs.length !== DB.ejs.length) {
      console.warn('[DB] saveDB verification failed');
    }
    console.log('[DB] localStorage saved:', { 
      ejs: DB.ejs.length, 
      clis: DB.clis.length, 
      infs: DB.infs.length 
    });
  } catch (e) { 
    console.error('[DB] saveDB localStorage error:', e); 
  }
  
  // Fire-and-forget Firestore sync
  loadFirebaseSync().then(sync => {
    if (sync?.forceSync) {
      return sync.forceSync().catch(err => console.error('[DB] Background Firestore sync failed:', err));
    }
  }).catch(err => console.error('[DB] Failed to load firebaseSync for background sync:', err));
}

/** Async version that awaits Firestore sync completion */
export async function saveDBAsync() {
  try {
    const data = JSON.stringify(DB);
    localStorage.setItem(STORAGE_KEY, data);
    try { 
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: data })); 
    } catch {}
    const check = localStorage.getItem(STORAGE_KEY);
    if (!check || JSON.parse(check).ejs.length !== DB.ejs.length) {
      console.warn('[DB] saveDBAsync verification failed');
    }
    console.log('[DB] localStorage saved (async):', { 
      ejs: DB.ejs.length, 
      clis: DB.clis.length, 
      infs: DB.infs.length 
    });
  } catch (e) { 
    console.error('[DB] saveDBAsync localStorage error:', e); 
    throw e;
  }

  // Await Firestore sync
  try {
    const sync = await loadFirebaseSync();
    if (sync?.forceSync) {
      await sync.forceSync();
      console.log('[DB] Firestore sync completed (async)');
    } else {
      console.warn('[DB] firebaseSync not ready, skipping Firestore sync');
    }
  } catch (error) {
    console.error('[DB] Firestore sync failed (async):', error);
    throw error;
  }
}

function readFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      DB.ejs = p.ejs || [];
      DB.clis = (p.clis || []).map(c => ({ asignaciones: c.asignaciones || {}, ...c }));
      DB.infs = p.infs || [];
      DB.workspaces = p.workspaces || [];
      DB.areas = (p.areas || []).map(a => ({ modulos: [], adminId: null, descripcion: '', ...a }));
      DB.moduloConfigs = p.moduloConfigs || {};
      DB.contribuciones = p.contribuciones || [];
      console.log('[DB] Loaded from localStorage:', { 
        ejs: DB.ejs.length, 
        clis: DB.clis.length, 
        infs: DB.infs.length 
      });
    }
  } catch (e) { 
    console.error('[DB] readFromStorage error:', e); 
  }
}

// NO migrateAndSeed - NO hardcoded defaults, NO demo data generation
// Data comes from Firebase. If empty, super_admin creates via UI.

/** Loads data from Firestore (source of truth) into local DB and localStorage. */
export async function loadDB() {
  console.log('[DB] Starting loadDB...');
  
  try {
    const sync = await loadFirebaseSync();
    const loaded = await sync.loadFromFirestore();
    
    if (!loaded) {
      // Fallback: localStorage only (offline mode)
      console.log('[DB] Firestore empty or failed, falling back to localStorage');
      readFromStorage();
      saveDB();
    } else {
      // Data loaded from Firestore, ensure localStorage matches
      console.log('[DB] Data loaded from Firestore, saving to localStorage');
      saveDB();
    }
    
    console.log('[DB] loadDB completed successfully');
    return true;
  } catch (error) {
    console.error('[DB] loadDB failed:', error);
    // Last resort: try localStorage
    readFromStorage();
    return false;
  }
}

/** Gets current sync status for debugging */
export function getSyncStatus() {
  return {
    firebaseSyncLoaded: !!firebaseSync,
    localStorageSize: JSON.stringify(DB).length,
    counts: {
      ejs: DB.ejs.length,
      clis: DB.clis.length,
      infs: DB.infs.length,
      workspaces: DB.workspaces.length,
      areas: DB.areas.length,
      contribuciones: DB.contribuciones.length,
    }
  };
}

// Auto-load on module import
loadDB();