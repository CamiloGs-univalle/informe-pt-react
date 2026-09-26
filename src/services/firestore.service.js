/**
 * services/firestore.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Firebase Firestore data layer - replaces localStorage persistence.
 * All models should use this service instead of directly accessing DB.
 */
import { db } from '../config/firebase';
import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch,
  serverTimestamp, Timestamp
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
  EJECUTIVOS: 'ejecutivos',
  CLIENTES: 'clientes',
  INFORMES: 'informes',
  WORKSPACES: 'workspaces',
  AREAS: 'areas',
  MODULO_CONFIGS: 'moduloConfigs',
  CONTRIBUCIONES: 'contribuciones',
};

// Generic helpers
function toDocSnap(doc) {
  return doc.exists() ? { id: doc.id, ...doc.data() } : null;
}

function toDocSnaps(querySnapshot) {
  return querySnapshot.docs.map(toDocSnap);
}

function convertTimestamps(obj) {
  if (!obj) return obj;
  const result = { ...obj };
  for (const [key, value] of Object.entries(result)) {
    if (value instanceof Timestamp) {
      result[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && value.seconds !== undefined) {
      result[key] = new Date(value.seconds * 1000).toISOString();
    }
  }
  return result;
}

// ── Ejecutivos ────────────────────────────────────────────────────────────

export async function getEjs() {
  const snap = await getDocs(collection(db, COLLECTIONS.EJECUTIVOS));
  return toDocSnaps(snap);
}

export async function getEj(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.EJECUTIVOS, id));
  return toDocSnap(snap);
}

export async function getUserByEmail(email) {
  if (!email) return null;
  const q = query(collection(db, COLLECTIONS.EJECUTIVOS), where('email', '==', email.toLowerCase()), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : toDocSnap(snap.docs[0]);
}

export async function getUsersByRole(role) {
  const q = query(collection(db, COLLECTIONS.EJECUTIVOS), where('role', '==', role));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function saveEj(data, actor) {
  if (data.email) data.email = data.email.toLowerCase().trim();
  if (!data.role) data.role = 'usuario';
  if (!data.password) data.password = 'Proservis2026';

  if (data.id) {
    const ref = doc(db, COLLECTIONS.EJECUTIVOS, data.id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { ...data, id: data.id };
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.EJECUTIVOS), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...data, id: ref.id };
  }
}

export async function deleteEj(id) {
  await deleteDoc(doc(db, COLLECTIONS.EJECUTIVOS, id));
}

export async function canDeleteEj(actor, targetId) {
  const target = await getEj(targetId);
  if (!target) return false;
  if (actor?.id === targetId) return false;
  if (target.role === 'super_admin' && actor?.role !== 'super_admin') return false;
  return true;
}

// ── Clientes ──────────────────────────────────────────────────────────────

export async function getClis() {
  const snap = await getDocs(collection(db, COLLECTIONS.CLIENTES));
  return toDocSnaps(snap);
}

export async function getCli(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.CLIENTES, id));
  return toDocSnap(snap);
}

export async function getClisForEj(ejId) {
  const q = query(collection(db, COLLECTIONS.CLIENTES), where('ejId', '==', ejId));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function getCliCountForEj(ejId) {
  const q = query(collection(db, COLLECTIONS.CLIENTES), where('ejId', '==', ejId));
  const snap = await getDocs(q);
  return snap.size;
}

export async function saveCli(data) {
  if (data.id) {
    const ref = doc(db, COLLECTIONS.CLIENTES, data.id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { ...data, id: data.id };
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.CLIENTES), {
      ...data,
      logo: data.logo || null,
      driveFolder: data.driveFolder || '',
      asignaciones: data.asignaciones || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { ...data, id: ref.id };
  }
}

export async function asignarAreaACliente(cliId, areaId, userId) {
  const ref = doc(db, COLLECTIONS.CLIENTES, cliId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = { ...snap.data() };
  if (!data.asignaciones) data.asignaciones = {};
  if (userId) data.asignaciones[areaId] = userId;
  else delete data.asignaciones[areaId];
  await updateDoc(ref, { asignaciones: data.asignaciones, updatedAt: serverTimestamp() });
  return { ...data, id: cliId, asignaciones: data.asignaciones };
}

export async function getAsignado(cliId, areaId) {
  const cli = await getCli(cliId);
  return cli?.asignaciones?.[areaId] || null;
}

export async function getClisForAreaUser(userId) {
  const snap = await getDocs(collection(db, COLLECTIONS.CLIENTES));
  return snap.docs
    .map(toDocSnap)
    .filter(c => c.asignaciones && Object.values(c.asignaciones).includes(userId));
}

export async function getClisVisiblesParaUsuario(user) {
  if (!user) return [];
  if (user.role === 'super_admin') return getClis();
  const all = await getClis();
  return all.filter(c => c.ejId === user.id || (c.asignaciones && Object.values(c.asignaciones).includes(user.id)));
}

export async function deleteCli(id) {
  await deleteDoc(doc(db, COLLECTIONS.CLIENTES, id));
}

export async function assignClientesToUser(clienteIds, userId) {
  const batch = writeBatch(db);
  for (const cid of clienteIds) {
    const ref = doc(db, COLLECTIONS.CLIENTES, cid);
    batch.update(ref, { ejId: userId, updatedAt: serverTimestamp() });
  }
  await batch.commit();
}

export async function getClientesAsignacionResumen() {
  const all = await getClis();
  const map = {};
  all.forEach(c => { if (c.ejId) map[c.ejId] = (map[c.ejId] || 0) + 1; });
  return map;
}

export async function saveCliFolder(cliId, folderPath) {
  const ref = doc(db, COLLECTIONS.CLIENTES, cliId);
  await updateDoc(ref, { driveFolder: folderPath, updatedAt: serverTimestamp() });
}

export async function getCliFolder(cliId) {
  const cli = await getCli(cliId);
  return cli?.driveFolder || '';
}

// ── Informes ──────────────────────────────────────────────────────────────

export async function getInfs() {
  const snap = await getDocs(query(collection(db, COLLECTIONS.INFORMES), orderBy('ts', 'desc')));
  return toDocSnaps(snap);
}

export async function getInfsForPeriodo(per) {
  const q = query(collection(db, COLLECTIONS.INFORMES), where('per', '==', per), orderBy('ts', 'desc'));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function getInfsForCliPeriodo(cliId, per) {
  const q = query(collection(db, COLLECTIONS.INFORMES), where('cliId', '==', cliId), where('per', '==', per), orderBy('ts', 'desc'));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function getInfsForCli(cliId) {
  const q = query(collection(db, COLLECTIONS.INFORMES), where('cliId', '==', cliId), orderBy('ts', 'desc'));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function getInfCountForCli(cliId) {
  const q = query(collection(db, COLLECTIONS.INFORMES), where('cliId', '==', cliId));
  const snap = await getDocs(q);
  return snap.size;
}

export async function getInfCountForEj(ejId) {
  const q = query(collection(db, COLLECTIONS.INFORMES), where('ejId', '==', ejId));
  const snap = await getDocs(q);
  return snap.size;
}

export async function saveInf(data) {
  if (!data.id) data.id = 'i' + Date.now();
  if (!data.ts) data.ts = new Date().toISOString();
  const ref = await addDoc(collection(db, COLLECTIONS.INFORMES), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { ...data, id: ref.id };
}

export async function deleteInf(id) {
  await deleteDoc(doc(db, COLLECTIONS.INFORMES, id));
}

export async function updateInfRating(id, rating, feedback) {
  const ref = doc(db, COLLECTIONS.INFORMES, id);
  await updateDoc(ref, { rating, feedback, ratedAt: serverTimestamp() });
  return { id, rating, feedback, ratedAt: new Date().toISOString() };
}

export async function updateInf(id, patch) {
  const ref = doc(db, COLLECTIONS.INFORMES, id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  return { id, ...patch };
}

// ── Workspaces ────────────────────────────────────────────────────────────

export async function getWorkspaces() {
  const snap = await getDocs(collection(db, COLLECTIONS.WORKSPACES));
  return toDocSnaps(snap);
}

export async function getWorkspace(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.WORKSPACES, id));
  return toDocSnap(snap);
}

export async function saveWorkspace(data) {
  if (data.id) {
    const ref = doc(db, COLLECTIONS.WORKSPACES, data.id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { ...data, id: data.id };
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.WORKSPACES), { ...data, createdAt: serverTimestamp() });
    return { ...data, id: ref.id };
  }
}

export async function deleteWorkspace(id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTIONS.WORKSPACES, id));
  const areasSnap = await getDocs(query(collection(db, COLLECTIONS.AREAS), where('workspaceId', '==', id)));
  areasSnap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ── Areas ─────────────────────────────────────────────────────────────────

export async function getAreas(workspaceId) {
  if (workspaceId) {
    const q = query(collection(db, COLLECTIONS.AREAS), where('workspaceId', '==', workspaceId));
    const snap = await getDocs(q);
    return toDocSnaps(snap);
  }
  const snap = await getDocs(collection(db, COLLECTIONS.AREAS));
  return toDocSnaps(snap);
}

export async function getArea(id) {
  const snap = await getDoc(doc(db, COLLECTIONS.AREAS, id));
  return toDocSnap(snap);
}

export async function saveArea(data) {
  if (data.id) {
    const ref = doc(db, COLLECTIONS.AREAS, data.id);
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    return { ...data, id: data.id };
  } else {
    const ref = await addDoc(collection(db, COLLECTIONS.AREAS), { ...data, createdAt: serverTimestamp() });
    return { ...data, id: ref.id };
  }
}

export async function deleteArea(id) {
  await deleteDoc(doc(db, COLLECTIONS.AREAS, id));
}

// ── Modulo Configs ────────────────────────────────────────────────────────

export async function getModuloConfig(userId) {
  const key = userId || 'global';
  const snap = await getDoc(doc(db, COLLECTIONS.MODULO_CONFIGS, key));
  return toDocSnap(snap) || null;
}

export async function saveModuloConfig(userId, cfg) {
  const key = userId || 'global';
  await updateDoc(doc(db, COLLECTIONS.MODULO_CONFIGS, key), { ...cfg, updatedAt: serverTimestamp() }, { merge: true });
  return cfg;
}

export async function getModuloConfigForClient(userId, cliId) {
  const key = `${userId}_${cliId}`;
  const snap = await getDoc(doc(db, COLLECTIONS.MODULO_CONFIGS, key));
  if (snap.exists()) return toDocSnap(snap);
  return getModuloConfig(userId);
}

export async function saveModuloConfigForClient(userId, cliId, cfg) {
  const key = `${userId}_${cliId}`;
  await updateDoc(doc(db, COLLECTIONS.MODULO_CONFIGS, key), { ...cfg, updatedAt: serverTimestamp() }, { merge: true });
  return cfg;
}

// ── Contribuciones ────────────────────────────────────────────────────────

export async function getContribuciones(filters = {}) {
  let q = collection(db, COLLECTIONS.CONTRIBUCIONES);
  const constraints = [];
  if (filters.cliId) constraints.push(where('cliId', '==', filters.cliId));
  if (filters.per) constraints.push(where('per', '==', filters.per));
  if (filters.areaId) constraints.push(where('areaId', '==', filters.areaId));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.estado) constraints.push(where('estado', '==', filters.estado));
  if (constraints.length) q = query(q, ...constraints);
  q = query(q, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return toDocSnaps(snap);
}

export async function saveContribucion(data) {
  if (!data.id) data.id = 'ct_' + Date.now();
  if (!data.createdAt) data.createdAt = new Date().toISOString();
  data.updatedAt = new Date().toISOString();
  const ref = await addDoc(collection(db, COLLECTIONS.CONTRIBUCIONES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...data, id: ref.id };
}

export async function updateContribucion(id, patch) {
  const ref = doc(db, COLLECTIONS.CONTRIBUCIONES, id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  return { id, ...patch };
}

export async function deleteContribucion(id) {
  await deleteDoc(doc(db, COLLECTIONS.CONTRIBUCIONES, id));
}

// ── Seed / Migration Helpers ──────────────────────────────────────────────

/**
 * Checks if Firestore is empty. Does NOT seed any data.
 * The first super_admin creates initial data via the UI:
 * - SuperAdmin page → Espacios y Áreas
 * - AdminEjecutivos → Personas
 * - AdminClientes → Clientes
 * Returns true if all collections are empty (fresh project).
 */
export async function seedIfEmpty() {
  const [ejs, workspaces, areas, clis] = await Promise.all([
    getEjs(), getWorkspaces(), getAreas(), getClis()
  ]);
  
  // NO hardcoded seed data - leave empty for super_admin to create
  return !ejs.length && !workspaces.length && !areas.length && !clis.length;
}

// ── Real-time listeners ───────────────────────────────────────────────────

export function subscribeEjs(callback) {
  return onSnapshot(collection(db, COLLECTIONS.EJECUTIVOS), snap => callback(toDocSnaps(snap)));
}

export function subscribeClis(callback) {
  return onSnapshot(collection(db, COLLECTIONS.CLIENTES), snap => callback(toDocSnaps(snap)));
}

export function subscribeInfs(callback) {
  return onSnapshot(query(collection(db, COLLECTIONS.INFORMES), orderBy('ts', 'desc')), snap => callback(toDocSnaps(snap)));
}

export function subscribeContribuciones(filters, callback) {
  let q = collection(db, COLLECTIONS.CONTRIBUCIONES);
  const constraints = [];
  if (filters.cliId) constraints.push(where('cliId', '==', filters.cliId));
  if (filters.per) constraints.push(where('per', '==', filters.per));
  if (filters.areaId) constraints.push(where('areaId', '==', filters.areaId));
  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.estado) constraints.push(where('estado', '==', filters.estado));
  if (constraints.length) q = query(q, ...constraints);
  q = query(q, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(toDocSnaps(snap)));
}