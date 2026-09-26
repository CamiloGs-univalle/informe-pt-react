/**
 * massUpload.js
 * ─────────────────────────────────────────────────────────────────────────
 * CARGA MASIVA: Plantillas descargables + subida CSV/Excel para Clientes y Ejecutivos
 * 
 * Uso:
 * 1. Descargar plantilla (botón en UI)
 * 2. Llenar en Excel/CSV
 * 3. Subir archivo → se valida y carga a Firestore
 */

import { db } from '../config/firebase';
import { 
  collection, doc, setDoc, writeBatch, getDocs, query, where 
} from 'firebase/firestore';
import { saveCli, getClis } from '../models/Cliente';
import { saveEj, getEjs } from '../models/Ejecutivo';
import { saveDB } from '../models/db';

// ─────────────────────────────────────────────────────────────────────────
// PLANTILLAS CSV
// ─────────────────────────────────────────────────────────────────────────

/** Plantilla CSV para Clientes */
export const CLIENTE_TEMPLATE_CSV = `nit,nom,marca,ciu,sec,ejId,driveFolder,selId,sstId,logo
800024095,MANITOBA S.A.S.,MANITOBA,Bogotá,,,,,
800130144,BURICA S.A.,BURICA,Medellín,,,,,
890311251,EJEMPLO CLIENTE S.A.S.,EJEMPLO,Cali,,,,,
`;

export const CLIENTE_TEMPLATE_HEADERS = [
  { key: 'nit', label: 'NIT *', required: true, example: '800024095', desc: 'NIT sin puntos ni guiones' },
  { key: 'nom', label: 'Nombre *', required: true, example: 'MANITOBA S.A.S.', desc: 'Razón social completa' },
  { key: 'marca', label: 'Marca', required: false, example: 'MANITOBA', desc: 'Nombre comercial corto' },
  { key: 'ciu', label: 'Ciudad', required: false, example: 'Bogotá', desc: 'Ciudad principal' },
  { key: 'sec', label: 'Sector', required: false, example: 'Industrial', desc: 'Sector económico' },
  { key: 'ejId', label: 'ID Atención al Cliente', required: false, example: 'e1234567890', desc: 'ID del ejecutivo que lidera (dejar vacío para asignar después)' },
  { key: 'driveFolder', label: 'Ruta Drive', required: false, example: 'Proservis/Informes/2026/Enero', desc: 'Carpeta en Google Drive' },
  { key: 'selId', label: 'ID Selección', required: false, example: 'e1234567891', desc: 'ID del psicólogo de Selección asignado' },
  { key: 'sstId', label: 'ID SST', required: false, example: 'e1234567892', desc: 'ID del profesional SST asignado' },
  { key: 'logo', label: 'Logo (base64)', required: false, example: 'data:image/png;base64,...', desc: 'Opcional: logo en base64 (máx 800KB)' }
];

/** Plantilla CSV para Ejecutivos */
export const EJECUTIVO_TEMPLATE_CSV = `nom,email,role,password,workspaceId,areaId,activo
Juan Pérez,juan.perez@proservis.com.co,usuario,Proservis2026,w1,a1,true
María García,maria.garcia@proservis.com.co,admin,Proservis2026,w1,a2,true
Carlos López,carlos.lopez@proservis.com.co,usuario,Proservis2026,w1,a1,true
`;

export const EJECUTIVO_TEMPLATE_HEADERS = [
  { key: 'nom', label: 'Nombre *', required: true, example: 'Juan Pérez', desc: 'Nombre completo' },
  { key: 'email', label: 'Email *', required: true, example: 'juan@proservis.com.co', desc: 'Correo corporativo (único)' },
  { key: 'role', label: 'Rol *', required: true, example: 'usuario', desc: 'super_admin | admin | usuario' },
  { key: 'password', label: 'Contraseña', required: false, example: 'Proservis2026', desc: 'Mín 6 chars. Default: Proservis2026' },
  { key: 'workspaceId', label: 'Workspace ID', required: false, example: 'w1', desc: 'ID del workspace (default: w1)' },
  { key: 'areaId', label: 'Área ID', required: false, example: 'a1', desc: 'a1=Selección, a2=SST, a3=Admin' },
  { key: 'activo', label: 'Activo', required: false, example: 'true', desc: 'true | false' }
];

// ─────────────────────────────────────────────────────────────────────────
// UTILIDADES CSV
// ─────────────────────────────────────────────────────────────────────────

export function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV simple (maneja comillas)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' && (j === 0 || line[j-1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx]?.replace(/^"|"$/g, '') || '';
    });
    rows.push(row);
  }
  
  return rows;
}

export function generateCSV(headers, rows) {
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const dataLines = rows.map(row => 
    headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

export function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────
// VALIDACIÓN
// ─────────────────────────────────────────────────────────────────────────

export function validateClienteRow(row, index, existingNits, existingEmails) {
  const errors = [];
  const warnings = [];
  
  // NIT
  if (!row.nit?.trim()) {
    errors.push(`Fila ${index}: NIT es requerido`);
  } else {
    const nit = row.nit.trim().replace(/[.\-]/g, '');
    if (!/^\d+$/.test(nit)) {
      errors.push(`Fila ${index}: NIT debe ser solo números: "${row.nit}"`);
    } else if (existingNits.has(nit)) {
      errors.push(`Fila ${index}: NIT duplicado en archivo: ${nit}`);
    } else {
      existingNits.add(nit);
    }
    row.nit = nit;
  }
  
  // Nombre
  if (!row.nom?.trim()) {
    errors.push(`Fila ${index}: Nombre es requerido`);
  } else {
    row.nom = row.nom.trim();
  }
  
  // Marca
  row.marca = row.marca?.trim() || '';
  
  // Ciudad
  row.ciu = row.ciu?.trim() || '';
  
  // Sector
  row.sec = row.sec?.trim() || '';
  
  // ejId
  row.ejId = row.ejId?.trim() || '';
  
  // driveFolder
  row.driveFolder = row.driveFolder?.trim() || '';
  
  // selId
  row.selId = row.selId?.trim() || '';
  
  // sstId
  row.sstId = row.sstId?.trim() || '';
  
  // logo
  row.logo = row.logo?.trim() || null;
  
  return { errors, warnings, row };
}

export function validateEjecutivoRow(row, index, existingEmails) {
  const errors = [];
  const warnings = [];
  
  // Nombre
  if (!row.nom?.trim()) {
    errors.push(`Fila ${index}: Nombre es requerido`);
  } else {
    row.nom = row.nom.trim();
  }
  
  // Email
  if (!row.email?.trim()) {
    errors.push(`Fila ${index}: Email es requerido`);
  } else {
    const email = row.email.trim().toLowerCase();
    if (!email.includes('@')) {
      errors.push(`Fila ${index}: Email inválido: "${row.email}"`);
    } else if (existingEmails.has(email)) {
      errors.push(`Fila ${index}: Email duplicado en archivo: ${email}`);
    } else {
      existingEmails.add(email);
    }
    row.email = email;
  }
  
  // Role
  const validRoles = ['super_admin', 'admin', 'usuario'];
  row.role = row.role?.trim().toLowerCase() || 'usuario';
  if (!validRoles.includes(row.role)) {
    errors.push(`Fila ${index}: Rol inválido "${row.role}". Use: ${validRoles.join(', ')}`);
  }
  
  // Password
  row.password = row.password?.trim() || 'Proservis2026';
  if (row.password.length < 6) {
    warnings.push(`Fila ${index}: Contraseña muy corta (mín 6), se usará default`);
    row.password = 'Proservis2026';
  }
  
  // Workspace
  row.workspaceId = row.workspaceId?.trim() || 'w1';
  
  // Area
  row.areaId = row.areaId?.trim() || 'a1';
  
  // Activo
  row.activo = row.activo?.trim().toLowerCase() !== 'false';
  
  return { errors, warnings, row };
}

// ─────────────────────────────────────────────────────────────────────────
// CARGA MASIVA A FIRESTORE
// ─────────────────────────────────────────────────────────────────────────

export async function uploadClientesCSV(csvText, onProgress) {
  const rows = parseCSV(csvText);
  console.log(`📥 Procesando ${rows.length} clientes...`);
  
  const existingNits = new Set();
  const existingEmails = new Set();
  const validRows = [];
  const allErrors = [];
  const allWarnings = [];
  
  // Validar
  for (let i = 0; i < rows.length; i++) {
    const { errors, warnings, row } = validateClienteRow(rows[i], i + 2, existingNits, existingEmails);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    if (errors.length === 0) validRows.push(row);
  }
  
  if (allErrors.length > 0) {
    return { 
      success: false, 
      errors: allErrors, 
      warnings: allWarnings,
      processed: 0,
      total: rows.length
    };
  }
  
  // Verificar NITs existentes en Firestore
  console.log('🔍 Verificando NITs existentes en Firestore...');
  const existingInDb = new Set();
  const clisSnap = await getDocs(collection(db, 'clientes'));
  clisSnap.docs.forEach(d => {
    const nit = d.data().nit?.replace(/[.\-]/g, '');
    if (nit) existingInDb.add(nit);
  });
  
  // Filtrar los que ya existen
  const toCreate = [];
  const toUpdate = [];
  
  for (const row of validRows) {
    if (existingInDb.has(row.nit)) {
      toUpdate.push(row);
    } else {
      toCreate.push(row);
    }
  }
  
  console.log(`   📝 ${toCreate.length} nuevos, 🔄 ${toUpdate.length} actualizaciones`);
  
  // Subir en batches
  let created = 0;
  let updated = 0;
  
  // Crear nuevos
  for (let i = 0; i < toCreate.length; i++) {
    const row = toCreate[i];
    try {
      await saveCli({
        nit: row.nit,
        nom: row.nom,
        marca: row.marca || null,
        ciu: row.ciu || null,
        sec: row.sec || null,
        ejId: row.ejId || null,
        driveFolder: row.driveFolder || '',
        logo: row.logo,
        asignaciones: {
          ...(row.selId ? { a1: row.selId } : {}),
          ...(row.sstId ? { a2: row.sstId } : {})
        }
      });
      created++;
      if (onProgress) onProgress({ created, updated, total: validRows.length, current: row.nom });
    } catch (e) {
      console.error(`Error creando ${row.nit}:`, e);
      allErrors.push(`Error creando ${row.nit}: ${e.message}`);
    }
  }
  
  // Actualizar existentes (buscar por NIT)
  for (let i = 0; i < toUpdate.length; i++) {
    const row = toUpdate[i];
    try {
      // Buscar cliente por NIT
      const q = query(collection(db, 'clientes'), where('nit', '==', row.nit));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const cliDoc = snap.docs[0];
        await setDoc(doc(db, 'clientes', cliDoc.id), {
          nom: row.nom,
          marca: row.marca || null,
          ciu: row.ciu || null,
          sec: row.sec || null,
          ejId: row.ejId || null,
          driveFolder: row.driveFolder || '',
          logo: row.logo,
          asignaciones: {
            ...(row.selId ? { a1: row.selId } : {}),
            ...(row.sstId ? { a2: row.sstId } : {})
          },
          updatedAt: new Date().toISOString()
        }, { merge: true });
        updated++;
      }
      if (onProgress) onProgress({ created, updated, total: validRows.length, current: row.nom });
    } catch (e) {
      console.error(`Error actualizando ${row.nit}:`, e);
      allErrors.push(`Error actualizando ${row.nit}: ${e.message}`);
    }
  }
  
  await saveDB();
  
  return { 
    success: allErrors.length === 0, 
    errors: allErrors, 
    warnings: allWarnings,
    created,
    updated,
    processed: created + updated,
    total: rows.length
  };
}

export async function uploadEjecutivosCSV(csvText, onProgress) {
  const rows = parseCSV(csvText);
  console.log(`📥 Procesando ${rows.length} ejecutivos...`);
  
  const existingEmails = new Set();
  const validRows = [];
  const allErrors = [];
  const allWarnings = [];
  
  // Validar
  for (let i = 0; i < rows.length; i++) {
    const { errors, warnings, row } = validateEjecutivoRow(rows[i], i + 2, existingEmails);
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    if (errors.length === 0) validRows.push(row);
  }
  
  if (allErrors.length > 0) {
    return { 
      success: false, 
      errors: allErrors, 
      warnings: allWarnings,
      processed: 0,
      total: rows.length
    };
  }
  
  // Verificar emails existentes en Firestore
  console.log('🔍 Verificando emails existentes en Firestore...');
  const existingInDb = new Set();
  const ejsSnap = await getDocs(collection(db, 'ejecutivos'));
  ejsSnap.docs.forEach(d => {
    const email = d.data().email?.toLowerCase();
    if (email) existingInDb.add(email);
  });
  
  // Filtrar
  const toCreate = [];
  const toUpdate = [];
  
  for (const row of validRows) {
    if (existingInDb.has(row.email)) {
      toUpdate.push(row);
    } else {
      toCreate.push(row);
    }
  }
  
  console.log(`   📝 ${toCreate.length} nuevos, 🔄 ${toUpdate.length} actualizaciones`);
  
  let created = 0;
  let updated = 0;
  
  // Crear nuevos
  for (let i = 0; i < toCreate.length; i++) {
    const row = toCreate[i];
    try {
      await saveEj({
        nom: row.nom,
        email: row.email,
        role: row.role,
        password: row.password,
        workspaceId: row.workspaceId,
        areaId: row.areaId,
        activo: row.activo
      });
      created++;
      if (onProgress) onProgress({ created, updated, total: validRows.length, current: row.nom });
    } catch (e) {
      console.error(`Error creando ${row.email}:`, e);
      allErrors.push(`Error creando ${row.email}: ${e.message}`);
    }
  }
  
  // Actualizar existentes
  for (let i = 0; i < toUpdate.length; i++) {
    const row = toUpdate[i];
    try {
      const q = query(collection(db, 'ejecutivos'), where('email', '==', row.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const ejDoc = snap.docs[0];
        await setDoc(doc(db, 'ejecutivos', ejDoc.id), {
          nom: row.nom,
          role: row.role,
          password: row.password,
          workspaceId: row.workspaceId,
          areaId: row.areaId,
          activo: row.activo,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        updated++;
      }
      if (onProgress) onProgress({ created, updated, total: validRows.length, current: row.nom });
    } catch (e) {
      console.error(`Error actualizando ${row.email}:`, e);
      allErrors.push(`Error actualizando ${row.email}: ${e.message}`);
    }
  }
  
  await saveDB();
  
  return { 
    success: allErrors.length === 0, 
    errors: allErrors, 
    warnings: allWarnings,
    created,
    updated,
    processed: created + updated,
    total: rows.length
  };
}

// ─────────────────────────────────────────────────────────────────────────
// EXPORTAR PLANTILLAS
// ─────────────────────────────────────────────────────────────────────────

export function downloadClienteTemplate() {
  downloadCSV(CLIENTE_TEMPLATE_CSV, 'plantilla_clientes.csv');
}

export function downloadEjecutivoTemplate() {
  downloadCSV(EJECUTIVO_TEMPLATE_CSV, 'plantilla_ejecutivos.csv');
}

export function getClienteTemplateInfo() {
  return { headers: CLIENTE_TEMPLATE_HEADERS, csv: CLIENTE_TEMPLATE_CSV };
}

export function getEjecutivoTemplateInfo() {
  return { headers: EJECUTIVO_TEMPLATE_HEADERS, csv: EJECUTIVO_TEMPLATE_CSV };
}