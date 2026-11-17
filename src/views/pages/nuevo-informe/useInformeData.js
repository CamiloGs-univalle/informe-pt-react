/**
 * Estado y acciones de TODOS los módulos del informe (headcount, selección,
 * rotación, SST, nómina…). Lo comparten el asistente "Nuevo informe" (ejecutivo
 * líder) y el formulario "Mis aportes" (trabajador de área) para no duplicar
 * la lógica ni los formularios.
 */
import { useState, useCallback } from 'react';

export const emptyRQ = () => ({ rq: '', agencia: '', ciudad: '', cargo: '', solicitadas: 0, contratadas: 0, oportunidad: 0, tiempoRespuesta: 0, diasCobertura: 0, estado: '', nota: '' });
export const emptyMotivo = () => ({ motivo: '', cantidad: 0 });
export const emptySede = (sede = '') => ({ sede, at: 0, expuestos: 0 });
export const emptyCaso = () => ({ nombre: '', identificacion: '', cie10: '', fechaInicio: '', origen: 'AT laboral', ciudad: '', estado: 'Abierto', seguimiento: '' });

const INICIAL = () => ({
  headcount: { inicio: 0, ingresos: 0, retiros: 0 },
  seleccion: [],
  rotacion: [],
  sst: { indicadores: {}, casos: [], sedes: [], severidad: {}, investigacion: {} },
  nomina: {},
  ausentismo: { horas: 0, eventos: 0, tasa: 0, diasPerdidos: 0, causas: '', obs: '' },
  capacitacion: { horas: 0, personas: 0, cobertura: 0, temas: [], obs: '' },
  clima: { satisfaccion: 0, enps: 0, participacion: 0, actividades: 0, encuesta: '', plan: '' },
  facturacion: { valor: 0, costo: 0, margen: 0, cartera: 0, estado: 'Al día', cumplimiento: 100, obs: '' },
  fotos: {},
  obs: '',
});

/** Reduce una foto a ~900 px y JPEG 70 %: Firestore limita cada documento a 1 MB. */
function comprimirFoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const max = 900;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function useInformeData() {
  const [d, setD] = useState(INICIAL);
  const set = useCallback((k) => (v) => setD(prev => ({ ...prev, [k]: typeof v === 'function' ? v(prev[k]) : v })), []);

  const api = {
    d,
    setHeadcount: set('headcount'), setSeleccion: set('seleccion'), setRotacion: set('rotacion'), setSst: set('sst'),
    setNomina: set('nomina'), setAusentismo: set('ausentismo'), setCapacitacion: set('capacitacion'),
    setClima: set('clima'), setFacturacion: set('facturacion'), setObs: set('obs'),
  };

  api.addRQ = () => api.setSeleccion(s => [...s, emptyRQ()]);
  api.removeRQ = (i) => api.setSeleccion(s => s.filter((_, x) => x !== i));
  api.updateRQ = (i, f, v) => api.setSeleccion(s => s.map((r, x) => (x === i ? { ...r, [f]: v } : r)));
  api.addMotivo = () => api.setRotacion(r => [...r, emptyMotivo()]);
  api.removeMotivo = (i) => api.setRotacion(r => r.filter((_, x) => x !== i));
  api.updateMotivo = (i, f, v) => api.setRotacion(r => r.map((m, x) => (x === i ? { ...m, [f]: v } : m)));
  api.addCaso = () => api.setSst(s => ({ ...s, casos: [...(s.casos || []), emptyCaso()] }));
  api.removeCaso = (i) => api.setSst(s => ({ ...s, casos: (s.casos || []).filter((_, x) => x !== i) }));
  api.updateCaso = (i, f, v) => api.setSst(s => ({ ...s, casos: (s.casos || []).map((c, x) => (x === i ? { ...c, [f]: v } : c)) }));
  api.addSede = (nombre = '') => api.setSst(s => ({ ...s, sedes: [...(s.sedes || []), emptySede(nombre)] }));
  api.removeSede = (i) => api.setSst(s => ({ ...s, sedes: (s.sedes || []).filter((_, x) => x !== i) }));
  api.updateSede = (i, f, v) => api.setSst(s => ({ ...s, sedes: (s.sedes || []).map((x, k) => (k === i ? { ...x, [f]: v } : x)) }));
  api.addCapTema = () => api.setCapacitacion(c => ({ ...c, temas: [...(c.temas || []), { tema: '', asistentes: 0, horas: 0 }] }));
  api.removeCapTema = (i) => api.setCapacitacion(c => ({ ...c, temas: (c.temas || []).filter((_, x) => x !== i) }));
  api.updateCapTema = (i, f, v) => api.setCapacitacion(c => ({ ...c, temas: (c.temas || []).map((t, x) => (x === i ? { ...t, [f]: v } : t)) }));

  /** Sube una foto al slot `i`; devuelve un mensaje de error o '' si salió bien. */
  api.handleFoto = async (i, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return '';
    try {
      const url = await comprimirFoto(file);
      setD(prev => ({ ...prev, fotos: { ...prev.fotos, [i]: url } }));
      return '';
    } catch (err) { return err.message; }
  };
  api.removeFoto = (i) => setD(prev => { const f = { ...prev.fotos }; delete f[i]; return { ...prev, fotos: f }; });

  /** Carga datos guardados (contribuciones fusionadas o de un área). Solo pisa lo que venga con contenido. */
  api.cargar = (datos, { reset = false } = {}) => {
    setD(prev => {
      const base = reset ? INICIAL() : { ...prev };
      const x = datos || {};
      const tiene = (v) => v != null && (typeof v !== 'object' || (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0));
      for (const k of ['headcount', 'seleccion', 'rotacion', 'sst', 'nomina', 'ausentismo', 'capacitacion', 'clima', 'facturacion', 'fotos']) {
        if (tiene(x[k])) base[k] = x[k];
      }
      if (typeof x.obs === 'string') base.obs = x.obs;
      if (base.sst) base.sst = { indicadores: {}, casos: [], sedes: [], severidad: {}, investigacion: {}, ...base.sst };
      return base;
    });
  };
  api.reiniciar = () => setD(INICIAL());

  /** Arma el objeto `datos` de una contribución, solo con los módulos indicados. */
  api.datosPara = (modulos) => {
    const out = {};
    for (const m of modulos) {
      if (['headcount', 'seleccion', 'rotacion', 'sst', 'nomina', 'ausentismo', 'capacitacion', 'clima', 'facturacion', 'fotos'].includes(m)) out[m] = d[m];
    }
    if (modulos.includes('sst') && d.obs) out.obs = d.obs;
    return out;
  };

  return api;
}
