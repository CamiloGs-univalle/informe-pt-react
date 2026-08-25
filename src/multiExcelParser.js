import * as XLSX from 'xlsx';

const SHEET_PATTERNS = {
  headcount: ['headcount', 'personal', 'movimiento', 'humano', 'talento', 'admin Personal'],
  seleccion: ['seleccin', 'selección', 'contrat', 'rq', 'vacante', 'reclut'],
  rotacion: ['rotacin', 'rotación', 'retiro', 'desvincul', 'causal'],
  sst: ['sst', 'seguridad', 'salud', 'accidente', 'riesgo'],
  nomina: ['nmina', 'nómina', 'payroll', 'liquidac', 'salario'],
};

function matchSheet(name, patterns) {
  const lower = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return patterns.some(p => lower.includes(p.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
}

function findCol(keys, patterns) {
  for (const k of keys) {
    const lk = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const p of patterns) {
      if (lk.includes(p)) return k;
    }
  }
  return null;
}

function val(row, key) { return row[key] ?? ''; }
function num(row, key) { return Number(row[key]) || 0; }

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sheets = {};
        wb.SheetNames.forEach(name => {
          const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (matchSheet(name, SHEET_PATTERNS.headcount)) sheets.headcount = data;
          else if (matchSheet(name, SHEET_PATTERNS.seleccion)) sheets.seleccion = data;
          else if (matchSheet(name, SHEET_PATTERNS.rotacion)) sheets.rotacion = data;
          else if (matchSheet(name, SHEET_PATTERNS.sst)) sheets.sst = data;
          else if (matchSheet(name, SHEET_PATTERNS.nomina)) sheets.nomina = data;
          else sheets[name] = data;
        });
        resolve({ fileName: file.name, sheets });
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseMultipleExcels(files) {
  return Promise.all(files.map(f => parseExcelFile(f)));
}

export function mergeExcelData(parsedFiles) {
  const merged = { headcount: [], seleccion: [], rotacion: [], sst: [], nomina: [], raw: {} };

  parsedFiles.forEach(pf => {
    Object.entries(pf.sheets).forEach(([key, data]) => {
      if (['headcount', 'seleccion', 'rotacion', 'sst', 'nomina'].includes(key)) {
        merged[key] = merged[key].concat(data);
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

export function extractSST(rows) {
  if (!rows.length) return { indicadores: {}, casos: [] };
  const r = rows[0];
  const keys = Object.keys(r);
  const find = (p) => { const k = findCol(keys, p); return k ? num(r, k) : 0; };
  const findS = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
  const indicadores = {
    at: find(['at', 'accidente', 'laboral']),
    oc: find(['oc', 'comun', 'común', 'transito', 'tránsito']),
    maternidad: find(['matern', 'licencia']),
    eg: find(['eg', 'enfermedad', 'general']),
    arl: find(['arl', 'cobertura']),
    inducciones: find(['inducci', 'capacit']),
  };
  const casos = rows.slice(1).map(r => {
    const keys = Object.keys(r);
    const f = (p) => { const k = findCol(keys, p); return k ? val(r, k) : ''; };
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
  return { indicadores, casos };
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
    totalRows: (extracted.seleccion?.length || 0) + (extracted.rotacion?.length || 0) + (extracted.sst?.casos?.length || 0),
  };

  return report;
}