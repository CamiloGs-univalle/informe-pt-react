import * as XLSX from 'xlsx';

export function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const result = {};
        wb.SheetNames.forEach(name => {
          const lower = name.toLowerCase();
          const data = XLSX.utils.sheet_to_json(wb.Sheets[name]);
          if (lower.includes('headcount') || lower.includes('personal') || lower.includes('movimiento'))
            result.headcount = data;
          else if (lower.includes('rotacin') || lower.includes('rotación') || lower.includes('retiro'))
            result.rotacion = data;
          else if (lower.includes('sst') || lower.includes('seguridad') || lower.includes('salud'))
            result.sst = data;
          else if (lower.includes('nmina') || lower.includes('nómina') || lower.includes('payroll'))
            result.nomina = data;
          else if (lower.includes('seleccin') || lower.includes('selección') || lower.includes('contrat') || lower.includes('rq'))
            result.seleccion = data;
          else if (lower.includes('foto') || lower.includes('actividad'))
            result.fotos = data;
          else result[name] = data;
        });
        resolve(result);
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function extractHeadcount(sheets) {
  const data = sheets.headcount || [];
  if (!data.length) return null;
  const row = data[0];
  const find = (keys) => {
    for (const k of Object.keys(row)) {
      for (const kw of keys) {
        if (k.toLowerCase().includes(kw)) return row[k] || 0;
      }
    }
    return 0;
  };
  return {
    inicio: Number(find(['inicio', 'activos inicio', 'inicial'])) || 0,
    ingresos: Number(find(['ingreso', 'ingresos', 'nuevo'])) || 0,
    retiros: Number(find(['retiro', 'retiros', 'salida'])) || 0,
  };
}

export function extractSeleccion(sheets) {
  const data = sheets.seleccion || [];
  return data.map(r => {
    const keys = Object.keys(r);
    const find = (kws) => {
      for (const k of keys) {
        for (const kw of kws) {
          if (k.toLowerCase().includes(kw)) return r[k] || '';
        }
      }
      return '';
    };
    return {
      rq: find(['rq', 'requerimiento', 'pt']),
      agencia: find(['agencia']),
      ciudad: find(['ciudad', 'ciudad']),
      cargo: find(['cargo', 'perfil']),
      solicitadas: Number(find(['solicit', 'necesit'])) || 0,
      contratadas: Number(find(['contrat', 'ingres'])) || 0,
      nota: find(['nota', 'observ']),
    };
  }).filter(r => r.rq || r.cargo);
}

export function extractRotacion(sheets) {
  const data = sheets.rotacion || [];
  return data.map(r => {
    const keys = Object.keys(r);
    const find = (kws) => {
      for (const k of keys) {
        for (const kw of kws) {
          if (k.toLowerCase().includes(kw)) return r[k] || '';
        }
      }
      return '';
    };
    return {
      motivo: find(['motivo', 'causal', 'razón']),
      cantidad: Number(find(['cant', 'cantidad', 'num'])) || 0,
    };
  }).filter(r => r.motivo);
}

export function extractSST(sheets) {
  const data = sheets.sst || [];
  if (!data.length) return { indicadores: {}, casos: [] };
  const row = data[0];
  const find = (keys) => {
    for (const k of Object.keys(row)) {
      for (const kw of keys) {
        if (k.toLowerCase().includes(kw)) return row[k] || 0;
      }
    }
    return 0;
  };
  const indicadores = {
    at: Number(find(['at', 'accidente', 'laboral'])) || 0,
    oc: Number(find(['oc', 'común', 'transito'])) || 0,
    maternidad: Number(find(['matern', 'licencia'])) || 0,
    eg: Number(find(['eg', 'enfermedad', 'general'])) || 0,
    arl: Number(find(['arl', 'cobertura'])) || 0,
    inducciones: Number(find(['inducci', 'capacit'])) || 0,
  };
  const casos = data.slice(1).map(r => {
    const keys = Object.keys(r);
    const find2 = (kws) => {
      for (const k of keys) {
        for (const kw of kws) {
          if (k.toLowerCase().includes(kw)) return r[k] || '';
        }
      }
      return '';
    };
    return {
      nombre: find2(['nombre', 'colaborador']),
      identificacion: find2(['id', 'cédula', 'cedula']),
      cie10: find2(['cie', 'diagnóstico', 'diagnostico']),
      fechaInicio: find2(['fecha', 'inicio']),
      origen: find2(['origen', 'tipo']) || 'AT laboral',
      ciudad: find2(['ciudad']),
      estado: find2(['estado']) || 'Abierto',
      seguimiento: find2(['seguimiento', 'obs']),
    };
  }).filter(c => c.nombre);
  return { indicadores, casos };
}

export function extractNomina(sheets) {
  const data = sheets.nomina || [];
  if (!data.length) return {};
  const row = data[0];
  const find = (keys) => {
    for (const k of Object.keys(row)) {
      for (const kw of keys) {
        if (k.toLowerCase().includes(kw)) return row[k] || 0;
      }
    }
    return 0;
  };
  return {
    liquidados: Number(find(['liquid', 'total'])) || 0,
    incapacidades: Number(find(['incapac'])) || 0,
    licencias: Number(find(['licencia'])) || 0,
    heDiurnas: Number(find(['extra', 'diurna'])) || 0,
    heNocturnas: Number(find(['nocturn'])) || 0,
    errores: Number(find(['error', 'nómina'])) || 0,
    observaciones: find(['obs', 'notas']) || '',
  };
}

export function generateMissingReport(extracted) {
  const missing = [];
  if (!extracted.headcount || (!extracted.headcount.inicio && !extracted.headcount.ingresos))
    missing.push('Datos de Headcount (Activos inicio, Ingresos, Retiros)');
  if (!extracted.seleccion || !extracted.seleccion.length)
    missing.push('Datos de Selección (Requerimientos, Solicitadas, Contratadas)');
  if (!extracted.rotacion || !extracted.rotacion.length)
    missing.push('Datos de Rotación (Motivos y cantidades)');
  if (!extracted.sst || !extracted.sst.indicadores.at)
    missing.push('Datos de SST (Accidentes, OC, Maternidad, ARL)');
  if (!extracted.nomina || !extracted.nomina.liquidados)
    missing.push('Datos de Nómina (Liquidados, Incapacidades, HE)');
  return missing;
}