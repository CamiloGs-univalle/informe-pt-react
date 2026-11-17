/**
 * services/excel.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Parses one or more uploaded Excel/CSV files (via the `xlsx` package) and
 * extracts the five report sections (Headcount, Selección, Rotación, SST,
 * Nómina) using fuzzy sheet-name and column-name matching, so it tolerates
 * the inconsistent spreadsheets clients actually send.
 *
 * (Moved from the previous flat `src/multiExcelParser.js`, same behaviour.
 * The older, unused `src/excelParser.js` single-file variant it superseded
 * was removed — see CHANGELOG.md.)
 */
import * as XLSX from 'xlsx';

const SHEET_PATTERNS = {
  headcount: ['headcount', 'personal', 'movimiento', 'humano', 'talento', 'admin Personal'],
  seleccion: ['seleccin', 'selección', 'contrat', 'rq', 'vacante', 'reclut'],
  rotacion: ['rotacin', 'rotación', 'retiro', 'desvincul', 'causal'],
  sst: ['sst', 'seguridad', 'salud', 'accidente', 'riesgo', 'tasa', 'severidad', 'incubadora', 'issa', 'db_indicadores', 'a.t'],
  nomina: ['nmina', 'nómina', 'payroll', 'liquidac', 'salario'],
  ausentismo: ['ausent', 'incapac', 'eg', 'enfermedad'],
  capacitacion: ['capacit', 'formac', 'entren'],
  clima: ['clima', 'bienestar', 'satisfac'],
  facturacion: ['factur', 'financ', 'cartera'],
};

function stripAccents(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchSheet(name, patterns) {
  const lower = stripAccents(name);
  return patterns.some(p => lower.includes(stripAccents(p)));
}

function findCol(keys, patterns) {
  for (const k of keys) {
    const lk = stripAccents(k);
    for (const p of patterns) {
      if (lk.includes(p)) return k;
    }
  }
  return null;
}

function val(row, key) { return row[key] ?? ''; }
/** Número seguro: acepta «#REF!», «#DIV/0!», vacíos y texto → 0. */
const numSeguro = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const norm = (s) => stripAccents(String(s ?? '')).replace(/\s+/g, ' ').trim();
const capitalizar = (t) => t.replace(/\b\p{L}/gu, c => c.toUpperCase());
/** Busca una columna cuyo nombre sea exactamente uno de los dados (para no confundir «AT» con «Maternidad»). */
const colExacta = (keys, nombres) => keys.find(k => nombres.includes(norm(k))) || null;

/**
 * Del ISSA (hoja DB_Indicadores) saca, para el mes pedido, lo de cada módulo de SST: accidentes y personas
 * expuestas por sede, días perdidos por accidentes e investigación de accidentes. Las filas se buscan por su
 * nombre (no por su posición), así sirve aunque el formato corra una fila.
 */
function sstModulosDeISSA(db2D, mesIdx) {
  const cel = (i) => numSeguro(db2D?.[i]?.[mesIdx]);
  const sedeDe = (t) => { const m = t.match(/sede\s+(.+)$/); return m ? capitalizar(m[1].trim()) : 'Nacional'; };
  const sedes = []; const dias = {}; let inv = null;
  (db2D || []).forEach((row, i) => {
    const t = norm(row?.[2]);
    if (!t) return;
    if (t.startsWith('tasa de accidentabilidad')) {
      const at = cel(i); const expuestos = cel(i + 1);
      if (at || expuestos) sedes.push({ sede: sedeDe(t), at, expuestos });
    } else if (t.startsWith('severidad de accidentabilidad')) {
      dias[sedeDe(t)] = cel(i);
    } else if (t.startsWith('cumplimiento de investigacion')) {
      inv = { investigados: cel(i), total: cel(i + 1) };
    }
  });
  sedes.sort((a, b) => (a.sede === 'Nacional' ? -1 : b.sede === 'Nacional' ? 1 : a.sede.localeCompare(b.sede)));
  const diasAT = dias.Nacional != null ? dias.Nacional : Object.values(dias).reduce((a, b) => a + b, 0);
  return {
    sedes,
    severidad: { diasAT, conDias: 0 },
    investigacion: inv ? { total: inv.total, investigados: inv.investigados, aTiempo: 0 } : { total: 0, investigados: 0, aTiempo: 0 },
  };
}

/**
 * Junta lo leído de un archivo con lo que la persona ya había escrito: el archivo manda en lo que trae,
 * y lo escrito a mano de los otros módulos de SST (severidad, investigación, sedes) no se pierde.
 */
export function fusionarSST(antes = {}, nuevo = {}) {
  const trae = (o) => !!o && Object.values(o).some(v => Number(v) > 0);
  return {
    ...antes, ...nuevo,
    sedes: (nuevo.sedes && nuevo.sedes.length ? nuevo.sedes : antes.sedes) || [],
    severidad: trae(nuevo.severidad) ? { ...(antes.severidad || {}), ...nuevo.severidad } : (antes.severidad || {}),
    investigacion: trae(nuevo.investigacion) ? { ...(antes.investigacion || {}), ...nuevo.investigacion } : (antes.investigacion || {}),
  };
}
function num(row, key) { return Number(row[key]) || 0; }

/** Parses a single Excel/CSV `File` into `{ fileName, sheets }`, sheets keyed by detected section. */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheets = {};
        // Detecta ISSA: si existe DB_Indicadores, guardarlo crudo con header:1
        const hasDB = wb.SheetNames.find(n=> n.toLowerCase().includes('db_') || n.toLowerCase().includes('db ') || n.toLowerCase()==='db_indicadores');
        let dbRaw = null;
        if (hasDB) {
          try { dbRaw = XLSX.utils.sheet_to_json(wb.Sheets[hasDB], {header:1}); sheets.db_issa = dbRaw; } catch {}
        }
        // También guardar A.T crudo para casos
        const atSheet = wb.SheetNames.find(n=> n.trim().toLowerCase()==='a.t' || n.toLowerCase().includes('a.t'));
        let atRaw = null;
        if (atSheet) {
          try { atRaw = XLSX.utils.sheet_to_json(wb.Sheets[atSheet], {header:1}); sheets.at_issa = atRaw; } catch {}
        }
        wb.SheetNames.forEach(name => {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (matchSheet(name, SHEET_PATTERNS.headcount)) sheets.headcount = data;
          else if (matchSheet(name, SHEET_PATTERNS.seleccion)) sheets.seleccion = data;
          else if (matchSheet(name, SHEET_PATTERNS.rotacion)) sheets.rotacion = data;
          else if (matchSheet(name, SHEET_PATTERNS.sst)) {
            // Si es ISSA, no sobreescribir si ya tenemos sst simple; acumular
            if (sheets.sst && sheets.sst.length && data.length) sheets.sst = sheets.sst.concat(data);
            else sheets.sst = data;
          }
          else if (matchSheet(name, SHEET_PATTERNS.nomina)) sheets.nomina = data;
          else sheets[name] = data;
        });
        // Marca origen ISSA para que extractSST sepa
        if (dbRaw) sheets._is_issa = true;
        resolve({ fileName: file.name, sheets });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Parses multiple files in parallel. */
export function parseMultipleExcels(files) {
  return Promise.all(files.map(f => parseExcelFile(f)));
}

/** Merges several parsed files' sections into one combined dataset. */
export function mergeExcelData(parsedFiles) {
  const merged = { headcount: [], seleccion: [], rotacion: [], sst: [], nomina: [], ausentismo: [], capacitacion: [], clima: [], facturacion: [], db_issa: null, at_issa: null, raw: {} };
  parsedFiles.forEach(pf => {
    Object.entries(pf.sheets).forEach(([key, data]) => {
      if (['headcount', 'seleccion', 'rotacion', 'sst', 'nomina', 'ausentismo', 'capacitacion', 'clima', 'facturacion'].includes(key)) {
        merged[key] = merged[key].concat(data);
      } else if (key==='db_issa' || key==='at_issa') {
        merged[key] = data;
      } else if (key==='_is_issa') {
        merged._is_issa = true;
      } else {
        merged.raw[pf.fileName + ':' + key] = data;
      }
    });
  });
  return merged;
}

export function extractHeadcount(rows) {
  if (!rows.length) return { inicio: 0, ingresos: 0, retiros: 0 };
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  return {
    inicio: find(['inicio', 'activos inicio', 'inicial', 'exist']),
    ingresos: find(['ingreso', 'ingresos', 'nuevo', 'nueva']),
    retiros: find(['retiro', 'retiros', 'salida', 'desvinc']),
  };
}

export function extractSeleccion(rows) {
  return rows.map(r => {
    const keys = Object.keys(r);
    const find = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
    const findN = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
    return {
      rq: find(['rq', 'requerimiento', 'pt', 'codigo']),
      agencia: find(['agencia', 'sede']),
      ciudad: find(['ciudad', 'municipio']),
      cargo: find(['cargo', 'perfil', 'funcion']),
      solicitadas: findN(['solicit', 'necesit', 'requerida']),
      contratadas: findN(['contrat', 'ingres', 'asignada']),
      oportunidad: findN(['oportunidad', 'oportun']),
      tiempoRespuesta: findN(['tiempo', 'respuesta', 'dias', 'durac', 'cobertura']),
      diasCobertura: findN(['dias', 'oportun', 'tiempo', 'cobertura', 'durac']),
      estado: find(['estado', 'est']),
      nota: find(['nota', 'obs', 'detalle']),
    };
  }).filter(r => r.rq || r.cargo);
}

export function extractRotacion(rows) {
  return rows.map(r => {
    const keys = Object.keys(r);
    const find = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
    const findN = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
    return {
      motivo: find(['motivo', 'causal', 'razon', 'razón', 'tipo']),
      cantidad: findN(['cant', 'cantidad', 'num', 'total']),
    };
  }).filter(r => r.motivo);
}

export function extractSST(rows, opts = {}) {
  // Si es ISSA (db_issa como 2D array), parsear por mes
  if (opts.db_issa) {
    return extractSSTFromISSA(opts.db_issa, opts.at_issa, opts.periodo);
  }
  // También si rows viene de ISSA pero sin opts, intentar detectar
  if (!rows.length) return { indicadores: {}, casos: [], sedes: [], severidad: {}, investigacion: {} };
  // Detecta si rows parece ser de ISSA (tiene estructura de DB_Indicadores con columnas Ene-Dic)
  const firstRowKeys = rows[0] ? Object.keys(rows[0]) : [];
  const maybeISSA = firstRowKeys.some(k=> ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'].some(m=> k.toLowerCase().includes(m)));
  if (maybeISSA && rows[0] && rows[0]['Indicador']) {
    // Es un parseo simple de ISSA como objetos, intentar extraer
  }
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  const indicadores = {
    at: find(['at', 'accidente', 'laboral']),
    oc: find(['oc', 'comun', 'común', 'transito', 'tránsito']),
    maternidad: find(['matern', 'licencia']),
    eg: find(['eg', 'enfermedad', 'general']),
    arl: find(['arl', 'cobertura']),
    inducciones: find(['inducci', 'capacit']),
    expuestos: find(['expuesto', 'trabajador', 'poblac']),
    tasaAccidentalidad: find(['tasa', 'accidentalidad']),
    severidad: find(['severidad', 'sever']),
    ausentismoTasa: find(['ausent', 'tasa aus']),
  };
  // Módulos de SST con columnas propias (todas opcionales): sedes, severidad e investigación
  const diasK = findCol(keys, ['dias perd', 'dias de incapacidad', 'dias incapacidad']);
  const conDiasK = findCol(keys, ['con incapacidad', 'con dias']);
  const totK = findCol(keys, ['por investigar', 'a investigar', 'ocurrid']);
  const hechosK = findCol(keys, ['investigados', 'investigado']);
  const tiempoK = findCol(keys, ['a tiempo', 'plazo']);
  const severidad = { diasAT: diasK ? num(r, diasK) : 0, conDias: conDiasK ? num(r, conDiasK) : 0 };
  const investigacion = { total: totK ? num(r, totK) : 0, investigados: hechosK ? num(r, hechosK) : 0, aTiempo: tiempoK ? num(r, tiempoK) : 0 };
  // Sedes: filas con una columna «Sede» (hoja «SST Sedes»); si solo trae «Expuestos», se toma como Nacional.
  let sedes = [];
  rows.forEach(row => {
    const ks = Object.keys(row);
    const sk = colExacta(ks, ['sede', 'sede / regional']);
    const nombre = sk ? String(val(row, sk)).trim() : '';
    if (!nombre) return;
    const atK = colExacta(ks, ['at', 'accidentes', 'accidentes de trabajo', 'accidentes (at)']);
    const exK = findCol(ks, ['expuest', 'trabajadores', 'personas']);
    const at = atK ? num(row, atK) : 0; const expuestos = exK ? num(row, exK) : 0;
    if (at || expuestos) sedes.push({ sede: nombre, at, expuestos });
  });
  if (!sedes.length && indicadores.expuestos > 0) sedes = [{ sede: 'Nacional', at: indicadores.at, expuestos: indicadores.expuestos }];
  // Helper ISSA: extrae del DB_Indicadores 2D para el mes del periodo
  function extractSSTFromISSA(db2D, at2D, periodo) {
    try {
      const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      let mesIdx = 7; // por defecto agosto (col L)
      if (periodo) {
        const m = parseInt(periodo.split('-')[1]||'8',10);
        mesIdx = 4 + m; // E=5 es ene (m=1), entonces col = 4+m
      } else {
        // buscar última columna con dato en fila de AT (row 7)
        for (let c=12; c>=5; c--) { if (db2D[6] && db2D[6][c]!==null && db2D[6][c]!=='' && !String(db2D[6][c]).includes('DIV')) { mesIdx=c; break; } }
      }
      // Fila 7 (idx 6) es AT nacional, fila 8 (7) es trabajadores, fila 10 (9) es tasa
      const atNal = Number(db2D[6]?.[mesIdx]||0);
      const trabNal = Number(db2D[7]?.[mesIdx]||0);
      const tasaNal = trabNal ? (atNal/trabNal*100) : 0;
      const sevNal = Number(db2D[20]?.[mesIdx]||0) || 0; // severidad nacional en fila 21
      // Ausentismo por EG está en hoja 15. Ausentismo por EG, fila Ago
      let ausDias = 0;
      try {
        // Buscar en db2D si hay fila de ausentismo? no, está en otra hoja no en db
        ausDias = 0;
      } catch {}
      const indicadores = {
        at: atNal,
        oc: 0,
        maternidad: 0,
        eg: 0, // los días por enfermedad general no vienen en esta hoja (el valor que se leía aquí era el resultado de severidad)
        arl: 100,
        inducciones: 0,
        expuestos: trabNal,
        tasaAccidentalidad: Number(tasaNal.toFixed(2)),
        severidad: Number(sevNal.toFixed(2)),
        ausentismoTasa: 0,
      };
      // Casos desde A.T 2D
      let casos=[];
      if (at2D && at2D.length) {
        // A.T sheet: buscar header NOMBRES Y APELLIDOS en col E (4)
        for (let r=0;r<at2D.length;r++) {
          const row=at2D[r];
          if (!row) continue;
          const nombre = row[4];
          const id = row[5];
          const loc = row[6];
          const origen = row[7];
          if (nombre && id && String(nombre).toLowerCase().includes('santos')===false && String(nombre).trim() && !String(nombre).toUpperCase().includes('NOMBRES')) {
            // filtrar filas válidas con nombre e id numérico
            if (String(id).match(/^[0-9]{5,}/) && String(nombre).length>5 && !String(nombre).includes('NOMBRES')) {
              casos.push({ nombre: String(nombre).trim(), identificacion: String(id).trim(), cie10:'', fechaInicio: String(row[5+1]||''), origen: String(origen||'AT laboral').trim()||'AT laboral', ciudad: String(loc||'').trim(), estado: 'Abierto', seguimiento: String(row[9]||'').trim() });
              if (casos.length>=12) break;
            }
          }
        }
        // Si no encontró con ese método, intentar segunda tabla en misma hoja (segunda sección)
        if (!casos.length) {
          for (let r=14;r<at2D.length;r++) {
            const row=at2D[r];
            if (!row) continue;
            const nombre=row[0]||row[1]||row[4];
            const id=row[1]||row[5];
            if (nombre && String(nombre).length>4 && !String(nombre).toUpperCase().includes('NOMBRES') && !String(nombre).toUpperCase().includes('TOTAL')) {
              // buscar
            }
          }
        }
      }
      const modulos = sstModulosDeISSA(db2D, mesIdx);
      const nac = modulos.sedes.find(x => x.sede === 'Nacional');
      if (nac) { indicadores.at = nac.at; indicadores.expuestos = nac.expuestos; indicadores.tasaAccidentalidad = nac.expuestos ? Number((nac.at / nac.expuestos * 100).toFixed(2)) : 0; }
      return { indicadores, casos, ...modulos };
    } catch (e) { return { indicadores:{at:0, oc:0, maternidad:0, eg:0, arl:100, inducciones:0, expuestos:0, tasaAccidentalidad:0, severidad:0}, casos:[], sedes:[], severidad:{}, investigacion:{} }; }
  }
  const casos = rows.slice(1).map(row => {
    const rowKeys = Object.keys(row);
    const f = (p) => { const k = findCol(rowKeys, p); return k ? val(row, k) : ''; };
    return {
      nombre: f(['nombre', 'colaborador', 'empleado']),
      identificacion: f(['id', 'cedula', 'cédula', 'documento']),
      cie10: f(['cie', 'diagnostico', 'diagnóstico']),
      fechaInicio: f(['fecha', 'inicio']),
      origen: f(['origen', 'tipo']) || 'AT laboral',
      ciudad: f(['ciudad']),
      estado: f(['estado']) || 'Abierto',
      seguimiento: f(['seguimiento', 'obs', 'detalle']),
    };
  }).filter(c => c.nombre);
  return { indicadores, casos, sedes, severidad, investigacion };
}

export function extractNomina(rows) {
  if (!rows.length) return {};
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  const findS = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
  return {
    liquidados: find(['liquid', 'total', 'nomina']),
    incapacidades: find(['incapac']),
    licencias: find(['licencia']),
    heDiurnas: find(['extra', 'diurna', 'hed']),
    heNocturnas: find(['nocturn', 'hen']),
    errores: find(['error']),
    observaciones: findS(['obs', 'notas']),
  };
}


export function extractAusentismo(rows) {
  if (!rows.length) return { horas: 0, eventos: 0, tasa: 0, diasPerdidos: 0, causas: '', obs: '' };
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  const findS = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
  return {
    horas: find(['horas', 'hora']),
    eventos: find(['evento', 'casos', 'incapac']),
    tasa: find(['tasa', 'porcent', '%']),
    diasPerdidos: find(['dias', 'perdido', 'ausencia']),
    tasaAccidentalidad: find(['tasa accidentalidad', 'tasa acc']),
    severidad: find(['severidad']),
    causas: findS(['causa', 'diagnostico', 'motivo']),
    obs: findS(['obs', 'plan', 'accion', 'notas']),
  };
}

export function extractCapacitacion(rows) {
  return rows.map(r => {
    const keys = Object.keys(r);
    const f = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
    const fn = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
    return { tema: f(['tema', 'curso', 'capacit', 'formac']), asistentes: fn(['asist', 'persona', 'particip']), horas: fn(['horas', 'durac', 'intensidad']) };
  }).filter(x=>x.tema);
}

export function extractFacturacion(rows) {
  if (!rows.length) return {};
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  const findS = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
  return {
    valor: find(['factur', 'valor', 'ingreso', 'venta']),
    costo: find(['costo', 'nomina', 'egreso']),
    margen: find(['margen', 'rentabilidad', '%']),
    cartera: find(['cartera', 'dias cartera', 'vencida']),
    estado: findS(['estado', 'est']) || 'Al día',
    cumplimiento: find(['cumplim', 'recaudo']) || 100,
    obs: findS(['obs', 'notas']),
  };
}
/** Summarizes what was found/missing across all sections, for the "Revisar" wizard step. */
export function generateDataReport(extracted) {
  const report = { available: [], missing: [], stats: {} };

  if (extracted.headcount?.inicio || extracted.headcount?.ingresos) {
    report.available.push({ section: 'Headcount', fields: ['Activos inicio', 'Ingresos', 'Retiros'] });
  } else report.missing.push('Headcount (Activos inicio, Ingresos, Retiros)');

  if (extracted.seleccion?.length) {
    report.available.push({ section: 'Selección', fields: [`${extracted.seleccion.length} RQs encontrados`] });
  } else report.missing.push('Selección (Requerimientos y contrataciones)');

  if (extracted.rotacion?.length) {
    report.available.push({ section: 'Rotación', fields: [`${extracted.rotacion.length} motivos encontrados`] });
  } else report.missing.push('Rotación (Motivos de retiro)');

  if (extracted.sst?.indicadores?.at || extracted.sst?.indicadores?.oc) {
    report.available.push({ section: 'SST', fields: ['Accidentes', 'OC', 'Maternidad'] });
  } else report.missing.push('SST (Seguridad y salud en el trabajo)');

  if (extracted.nomina?.liquidados) {
    report.available.push({ section: 'Nómina', fields: ['Liquidados', 'Incapacidades', 'HE'] });
  } else report.missing.push('Nómina (Liquidados y novedades)');

  report.stats = {
    sheetsFound: Object.keys(extracted).filter(k => extracted[k] && (Array.isArray(extracted[k]) ? extracted[k].length : true)).length,
    totalRows: (extracted.seleccion?.length || 0) + (extracted.rotacion?.length || 0) + (extracted.sst?.casos?.length || 0) + (extracted.ausentismo?.length || 0),
  };

  return report;
}
