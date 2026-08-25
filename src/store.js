const STORAGE_KEY = 'ps_v3';

const MOTIVOS_PRE = [
  'Terminación de la obra o labor','Renuncia voluntaria',
  'Renuncia por equilibrio trabajo/vida personal','Abandono de cargo',
  'Paso de temporal al cliente','Período de prueba','Mutuo acuerdo','Otro'
];

const FOTOLABELS = [
  'Inducción SST','Capacitación','Inspección EPP','Actividad bienestar',
  'Visita al cliente','Otra actividad','Actividad 7','Actividad 8','Actividad 9'
];

const DEFAULT_EJS = [
  {id:'e1',nom:'Andrea Gómez',email:'agomez@proservis.co',zona:'Bucaramanga'},
  {id:'e2',nom:'Carlos Martínez',email:'cmartinez@proservis.co',zona:'Cali'},
  {id:'e3',nom:'Diana Pérez',email:'dperez@proservis.co',zona:'Medellín'},
  {id:'e4',nom:'Felipe Torres',email:'ftorres@proservis.co',zona:'Bogotá'},
  {id:'e5',nom:'Juliana Ríos',email:'jrios@proservis.co',zona:'Bucaramanga'},
  {id:'e6',nom:'Mauricio Silva',email:'msilva@proservis.co',zona:'Barranquilla'},
  {id:'e7',nom:'Andrea Martínez',email:'amartinez@proservis.co',zona:'Valle del Cauca'}
];

const DEFAULT_CLIS = [
  {id:'c1',nom:'Incubadora Santander',marca:'Huevos Kikes',nit:'890.203.084-5',ciu:'Girón',sec:'Alimentos',ejId:'e7',logo:null,driveFolder:''},
  {id:'c2',nom:'Empresa Modelo ABC',marca:'ABC',nit:'800.100.200-1',ciu:'Bucaramanga',sec:'Manufactura',ejId:'e1',logo:null,driveFolder:''},
  {id:'c3',nom:'Industrias del Sur',marca:'',nit:'900.300.400-2',ciu:'Cali',sec:'Logística',ejId:'e2',logo:null,driveFolder:''},
  {id:'c4',nom:'Cruz Roja Colombiana',marca:'Seccional Valle del Cauca',nit:'',ciu:'Cali',sec:'Salud / ONG',ejId:'e7',logo:null,driveFolder:''},
  {id:'c5',nom:'Mi Super Mercado',marca:'',nit:'',ciu:'',sec:'Comercio / Retail',ejId:'e7',logo:null,driveFolder:''}
];

let DB = { ejs: [], clis: [], infs: [] };

// Load immediately on module import (synchronous)
(function initDB() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); DB.ejs = p.ejs || []; DB.clis = p.clis || []; DB.infs = p.infs || []; }
  } catch(e) {}
  if (!DB.ejs.length) DB.ejs = JSON.parse(JSON.stringify(DEFAULT_EJS));
  if (!DB.clis.length) DB.clis = JSON.parse(JSON.stringify(DEFAULT_CLIS));
  saveDB();
})();

function loadDB() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { const p = JSON.parse(s); DB.ejs = p.ejs || []; DB.clis = p.clis || []; DB.infs = p.infs || []; }
  } catch(e) {}
  if (!DB.ejs.length) DB.ejs = JSON.parse(JSON.stringify(DEFAULT_EJS));
  if (!DB.clis.length) DB.clis = JSON.parse(JSON.stringify(DEFAULT_CLIS));
  saveDB();
}

function saveDB() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch(e) {}
}

function getEjs() { return DB.ejs; }
function getClis() { return DB.clis; }
function getInfs() { return DB.infs; }
function getEj(id) { return DB.ejs.find(e => e.id === id); }
function getCli(id) { return DB.clis.find(c => c.id === id); }

function saveEj(data) {
  if (data.id) { const e = DB.ejs.find(x => x.id === data.id); if (e) Object.assign(e, data); }
  else { data.id = 'e' + Date.now(); DB.ejs.push(data); }
  saveDB(); return data;
}
function deleteEj(id) { DB.ejs = DB.ejs.filter(e => e.id !== id); saveDB(); }

function saveCli(data) {
  if (data.id) { const c = DB.clis.find(x => x.id === data.id); if (c) Object.assign(c, data); }
  else { data.id = 'c' + Date.now(); data.logo = data.logo || null; data.driveFolder = data.driveFolder || ''; DB.clis.push(data); }
  saveDB(); return data;
}
function deleteCli(id) { DB.clis = DB.clis.filter(c => c.id !== id); saveDB(); }

function saveCliFolder(cliId, folderPath) {
  const c = DB.clis.find(x => x.id === cliId);
  if (c) { c.driveFolder = folderPath; saveDB(); }
}
function getCliFolder(cliId) {
  const c = DB.clis.find(x => x.id === cliId);
  return c ? c.driveFolder : '';
}

function getInfsForPeriodo(per) {
  return DB.infs.filter(i => i.per === per);
}

function getInfsForCliPeriodo(cliId, per) {
  return DB.infs.filter(i => i.cliId === cliId && i.per === per);
}

function saveInf(data) {
  if (!data.id) data.id = 'i' + Date.now();
  if (!data.ts) data.ts = new Date().toISOString();
  DB.infs.push(data); saveDB(); return data;
}
function deleteInf(id) { DB.infs = DB.infs.filter(i => i.id !== id); saveDB(); }

function getInfCountForCli(cliId) { return DB.infs.filter(i => i.cliId === cliId).length; }
function getInfCountForEj(ejId) { return DB.infs.filter(i => i.ejId === ejId).length; }
function getCliCountForEj(ejId) { return DB.clis.filter(c => c.ejId === ejId).length; }

function getClisForEj(ejId) { return DB.clis.filter(c => c.ejId === ejId); }
function getInfsForCli(cliId) { return DB.infs.filter(i => i.cliId === cliId); }

function fmtPer(p) {
  if (!p) return '—';
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const pts = p.split('-');
  return M[+pts[1] - 1] + ' ' + pts[0];
}

function fmtPerLong(p) {
  if (!p) return '—';
  const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const pts = p.split('-');
  return M[+pts[1] - 1] + ' ' + pts[0];
}

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(() => t.classList.remove('on'), 2800);
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function downloadHTML(html, nombre) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

export {
  loadDB, saveDB, getEjs, getClis, getInfs, getEj, getCli,
  saveEj, deleteEj, saveCli, deleteCli, saveInf, deleteInf,
  getInfCountForCli, getInfCountForEj, getCliCountForEj,
  getClisForEj, getInfsForCli, getInfsForPeriodo, getInfsForCliPeriodo,
  saveCliFolder, getCliFolder,
  fmtPer, fmtPerLong, toast, fmtSize, downloadHTML,
  MOTIVOS_PRE, FOTOLABELS
};