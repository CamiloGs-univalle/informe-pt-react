/** ¿Esta persona ya llenó algo de este módulo? (para los avisos «con datos / sin datos» del aporte). */
const lleno = (v) => (Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.values(v).some(lleno) : typeof v === 'string' ? v.trim() !== '' : Boolean(v));

export function moduloConDatos(id, d) {
  const x = d?.[id];
  if (x == null) return false;
  switch (id) {
    case 'facturacion': return !!(Number(x.valor) || Number(x.costo) || Number(x.margen) || Number(x.cartera) || (x.obs || '').trim());
    case 'sst': return lleno(x.indicadores) || (x.casos || []).length > 0 || (d.obs || '').trim() !== '' || (x.sedes || []).some(s => Number(s.at) || Number(s.expuestos)) || lleno(x.severidad) || lleno(x.investigacion);
    case 'capacitacion': return !!(Number(x.horas) || Number(x.personas) || Number(x.cobertura) || (x.temas || []).some(t => (t.tema || '').trim()));
    case 'seleccion': return x.some(r => r.rq || r.cargo || Number(r.solicitadas) || Number(r.contratadas));
    case 'rotacion': return x.some(m => m.motivo || Number(m.cantidad));
    default: return lleno(x);
  }
}

/** Cantidad de módulos con datos sobre el total. */
export function avance(modulos, d) {
  const hechos = modulos.filter(m => moduloConDatos(m, d)).length;
  return { hechos, total: modulos.length };
}
