/**
 * utils/massUpload.js
 * ─────────────────────────────────────────────────────────────────────────
 * Carga masiva desde CSV (clientes y personas) en dos pasos:
 *   1) plan…()    → lee el archivo y dice qué se va a crear, actualizar u omitir (sin tocar nada)
 *   2) aplicar…() → ejecuta el plan con los mismos modelos que usa el resto de la app
 *                   (saveCli / saveEj), así no hay duplicados ni escrituras paralelas a Firestore.
 * No se manejan contraseñas: el acceso lo da Firebase Authentication.
 */
import { DB } from '../models/db';
import { saveCli } from '../models/Cliente';
import { saveEj } from '../models/Ejecutivo';

// ── CSV ──────────────────────────────────────────────────────────────────

/** Lee CSV con comillas, saltos de línea dentro de comillas, BOM y separador , o ; */
export function parseCSV(texto) {
  const t = String(texto || '').replace(/^\uFEFF/, '');
  const primera = t.split(/\r?\n/, 1)[0] || '';
  const sep = (primera.match(/;/g) || []).length > (primera.match(/,/g) || []).length ? ';' : ',';
  const filas = [];
  let fila = [], cel = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cel += '"'; i++; }
      else if (ch === '"') q = false;
      else cel += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { fila.push(cel.trim()); cel = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      fila.push(cel.trim()); cel = '';
      if (fila.some(c => c !== '')) filas.push(fila);
      fila = [];
    } else cel += ch;
  }
  fila.push(cel.trim());
  if (fila.some(c => c !== '')) filas.push(fila);
  if (filas.length < 2) return [];
  const cab = filas[0].map(norm);
  return filas.slice(1).map(f => Object.fromEntries(cab.map((h, i) => [h, f[i] ?? ''])));
}

/** minúsculas, sin tildes ni espacios raros: "Líder Email" → "lider_email" */
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[\s-]+/g, '_');
}
const soloDigitos = (s) => String(s || '').replace(/\D/g, '');
const sinTildes = (s) => norm(s).replace(/_/g, ' ');
const esSi = (v) => ['si', 'sí', 's', '1', 'true', 'activo', 'activa', 'x'].includes(sinTildes(v));
const esNo = (v) => ['no', 'n', '0', 'false', 'inactivo', 'inactiva'].includes(sinTildes(v));

function descargar(contenido, nombre) {
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

// ── Definición de columnas (se muestra en pantalla y en la plantilla) ────

export const COLUMNAS_CLIENTES = [
  { key: 'nit', req: true, desc: 'NIT sin dígito de verificación; sirve para detectar si el cliente ya existe', ej: '800024095' },
  { key: 'nombre', req: true, desc: 'Razón social', ej: 'MANITOBA S.A.S.' },
  { key: 'marca', req: false, desc: 'Nombre comercial', ej: '' },
  { key: 'ciudad', req: false, desc: 'Ciudad', ej: 'Cali' },
  { key: 'sector', req: false, desc: 'Sector económico', ej: 'Industrial' },
  { key: 'lider_email', req: false, desc: 'Correo del ejecutivo que lidera el informe de este cliente', ej: 'ejecutivo@proservis.com.co' },
  { key: 'carpeta_drive', req: false, desc: 'Enlace a la carpeta de Drive del cliente', ej: '' },
];
export const COLUMNAS_PERSONAS = [
  { key: 'nombre', req: true, desc: 'Nombre completo', ej: 'Laura Gómez' },
  { key: 'correo', req: true, desc: 'Correo con el que entra (Google o Firebase)', ej: 'laura.gomez@proservis.com.co' },
  { key: 'rol', req: false, desc: 'usuario, admin o super_admin (por defecto usuario)', ej: 'usuario' },
  { key: 'area', req: false, desc: 'Nombre exacto de un área ya creada', ej: 'Atención al Cliente' },
  { key: 'zona', req: false, desc: 'Ciudad o zona', ej: 'Cali' },
  { key: 'activo', req: false, desc: 'si o no (por defecto si)', ej: 'si' },
];

const plantilla = (cols) => [cols.map(c => c.key).join(','), cols.map(c => `"${c.ej}"`).join(',')].join('\n');
export const descargarPlantillaClientes = () => descargar(plantilla(COLUMNAS_CLIENTES), 'plantilla-clientes.csv');
export const descargarPlantillaPersonas = () => descargar(plantilla(COLUMNAS_PERSONAS), 'plantilla-personas.csv');

// ── Clientes ─────────────────────────────────────────────────────────────

export function planClientes(texto) {
  const filas = parseCSV(texto);
  const porNit = new Map(DB.clis.map(c => [soloDigitos(c.nit), c]));
  const vistos = new Set();
  const plan = filas.map((r, i) => {
    const n = i + 2; // línea en el archivo
    const errores = [], avisos = [];
    const nit = soloDigitos(r.nit);
    const nom = (r.nombre || r.nom || '').trim();
    if (!nit) errores.push('Falta el NIT.');
    if (!nom) errores.push('Falta el nombre.');
    if (nit && vistos.has(nit)) errores.push('El NIT está repetido en el archivo.');
    if (nit) vistos.add(nit);
    let ejId;
    const mail = (r.lider_email || '').toLowerCase().trim();
    if (mail) {
      const ej = DB.ejs.find(e => (e.email || '').toLowerCase() === mail);
      if (ej) ejId = ej.id; else avisos.push(`No existe una persona con el correo ${mail}; el cliente queda sin líder.`);
    }
    const existente = nit ? porNit.get(nit) : null;
    const datos = { nit, nom, marca: r.marca || '', ciu: r.ciudad || '', sec: r.sector || '', driveFolder: r.carpeta_drive || '' };
    if (ejId) datos.ejId = ejId;
    return { n, nombre: nom || '(sin nombre)', accion: errores.length ? 'error' : existente ? 'actualizar' : 'crear', existenteId: existente?.id, datos, errores, avisos };
  });
  return resumir(plan);
}

export function aplicarClientes(plan) {
  const wsDef = DB.workspaces[0]?.id || '';
  let creados = 0, actualizados = 0;
  plan.filas.forEach(f => {
    if (f.accion === 'error') return;
    if (f.accion === 'actualizar') {
      // Solo se pisan los campos que el archivo trae con valor
      const cambios = Object.fromEntries(Object.entries(f.datos).filter(([, v]) => v !== ''));
      saveCli({ ...cambios, id: f.existenteId }); actualizados++;
    } else {
      saveCli({ ...f.datos, ejId: f.datos.ejId || '', workspaceId: wsDef }); creados++;
    }
  });
  return { creados, actualizados, omitidos: plan.filas.length - creados - actualizados };
}

// ── Personas ─────────────────────────────────────────────────────────────

const ROLES_OK = { usuario: 'usuario', admin: 'admin', administrador: 'admin', super_admin: 'super_admin', superadmin: 'super_admin', 'super admin': 'super_admin' };

export function planPersonas(texto, actor) {
  const filas = parseCSV(texto);
  const porMail = new Map(DB.ejs.map(e => [(e.email || '').toLowerCase(), e]));
  const vistos = new Set();
  const plan = filas.map((r, i) => {
    const n = i + 2;
    const errores = [], avisos = [];
    const nom = (r.nombre || r.nom || '').trim();
    const email = (r.correo || r.email || '').toLowerCase().trim();
    if (!nom) errores.push('Falta el nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('El correo no es válido.');
    if (email && vistos.has(email)) errores.push('El correo está repetido en el archivo.');
    if (email) vistos.add(email);
    const rolTxt = sinTildes(r.rol || '') || 'usuario';
    const role = ROLES_OK[rolTxt.replace(/ /g, '_')] || ROLES_OK[rolTxt];
    if (!role) errores.push(`Rol desconocido «${r.rol}». Usa usuario, admin o super_admin.`);
    if (role === 'super_admin' && actor?.role !== 'super_admin') errores.push('Solo un super admin puede crear super admins.');
    let areaId = '', workspaceId = '';
    if (r.area) {
      const a = DB.areas.find(x => sinTildes(x.nombre) === sinTildes(r.area));
      if (a) { areaId = a.id; workspaceId = a.workspaceId; } else avisos.push(`No existe el área «${r.area}»; la persona queda sin área.`);
    }
    let activo;
    if (esSi(r.activo)) activo = true; else if (esNo(r.activo)) activo = false;
    const existente = email ? porMail.get(email) : null;
    const datos = { nom, email, role: role || 'usuario', zona: r.zona || '' };
    if (areaId) { datos.areaId = areaId; datos.workspaceId = workspaceId; }
    if (activo !== undefined) datos.activo = activo;
    return { n, nombre: nom || '(sin nombre)', accion: errores.length ? 'error' : existente ? 'actualizar' : 'crear', existenteId: existente?.id, datos, errores, avisos };
  });
  return resumir(plan);
}

export function aplicarPersonas(plan, actor) {
  let creados = 0, actualizados = 0;
  const fallos = [];
  plan.filas.forEach(f => {
    if (f.accion === 'error') return;
    try {
      if (f.accion === 'actualizar') {
        const cambios = Object.fromEntries(Object.entries(f.datos).filter(([, v]) => v !== ''));
        saveEj({ ...cambios, id: f.existenteId }, actor); actualizados++;
      } else {
        saveEj({ areaId: '', workspaceId: DB.workspaces[0]?.id || '', activo: true, ...f.datos }, actor); creados++;
      }
    } catch (e) { fallos.push(`Línea ${f.n}: ${e.message}`); }
  });
  return { creados, actualizados, omitidos: plan.filas.length - creados - actualizados - fallos.length, fallos };
}

function resumir(filas) {
  const cuenta = (a) => filas.filter(f => f.accion === a).length;
  return { filas, crear: cuenta('crear'), actualizar: cuenta('actualizar'), errores: cuenta('error'), total: filas.length };
}
