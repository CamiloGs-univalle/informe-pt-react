/** Genera un id único con prefijo. Seguro aunque se llame varias veces en el mismo milisegundo. */
export function nuevoId(prefix, existentes = []) {
  const usados = existentes instanceof Set ? existentes : new Set(existentes.map(x => (typeof x === 'string' ? x : x?.id)));
  let id;
  do { id = prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); } while (usados.has(id));
  return id;
}
