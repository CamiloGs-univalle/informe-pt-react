/**
 * views/pages/nuevo-informe/steps.js
 * ─────────────────────────────────────────────────────────────────────────
 * The two step sequences for the "Nuevo informe" wizard. Kept as plain data
 * (icon/label/desc per step) so `NuevoInforme.jsx` and the step indicator
 * can both render off the same source of truth.
 */
export const STEPS_AUTO = [
  { id: 'cli', icon: '👤', label: 'Cliente', desc: 'Selecciona el cliente y el período del informe' },
  { id: 'drive', icon: '📁', label: 'Archivos', desc: 'Conecta Drive o sube los Excel con la información' },
  { id: 'parse', icon: '🔍', label: 'Revisar', desc: 'Revisa los datos extraídos de los archivos' },
  { id: 'edit', icon: '✏️', label: 'Ajustar', desc: 'Modifica o completa los datos antes de generar' },
  { id: 'photos', icon: '📷', label: 'Fotos', desc: 'Sube fotos de las actividades del mes' },
  { id: 'preview', icon: '👁', label: 'Vista previa', desc: 'Visualiza cómo quedará el informe' },
  { id: 'export', icon: '📥', label: 'Exportar', desc: 'Descarga en HTML y PDF' },
];

export const STEPS_MANUAL = [
  { id: 'cli', icon: '👤', label: 'Cliente', desc: 'Selecciona el cliente y el período' },
  { id: 'headcount', icon: '👥', label: 'Headcount', desc: 'Movimiento de personal del mes' },
  { id: 'seleccion', icon: '🎯', label: 'Selección', desc: 'Requerimientos y contrataciones' },
  { id: 'rotacion', icon: '↻', label: 'Rotación', desc: 'Motivos de retiro del personal' },
  { id: 'sst', icon: '🛡️', label: 'SST', desc: 'Seguridad y salud en el trabajo' },
  { id: 'nomina', icon: '💰', label: 'Nómina', desc: 'Liquidaciones y novedades' },
  { id: 'ausentismo', icon: '⏰', label: 'Ausentismo', desc: 'Incapacidades y ausencias' },
  { id: 'capacitacion', icon: '🎓', label: 'Capacitación', desc: 'Formación y entrenamiento' },
  { id: 'clima', icon: '😊', label: 'Clima', desc: 'Bienestar y satisfacción' },
  { id: 'facturacion', icon: '🧾', label: 'Facturación', desc: 'Indicadores financieros' },
  { id: 'photos', icon: '📷', label: 'Fotos', desc: 'Registro fotográfico' },
  { id: 'preview', icon: '👁', label: 'Vista previa', desc: 'Visualiza el informe' },
  { id: 'export', icon: '📥', label: 'Exportar', desc: 'Descarga HTML y PDF' },
];

/**
 * Maps a wizard step id to the `MODULOS` (constants.js) id that gates it —
 * only for steps that belong to exactly one module. A step id missing from
 * this map (cli, drive, parse, edit, preview, export) is never gated: it's
 * either always required, or — for "Revisar"/"Ajustar" in modo automático —
 * it works from whatever the uploaded Excel contains, covering several
 * modules at once, so it can't be tied to a single one.
 *
 * Note the deliberate id mismatch: the step is `photos` but its module is
 * `fotos` (see `MODULOS` in constants.js) — mapped explicitly here.
 */
const STEP_TO_MODULO = {
  headcount: 'headcount',
  seleccion: 'seleccion',
  rotacion: 'rotacion',
  sst: 'sst',
  nomina: 'nomina',
  ausentismo: 'ausentismo',
  capacitacion: 'capacitacion',
  clima: 'clima',
  facturacion: 'facturacion',
  photos: 'fotos',
};

/** Keeps only the steps that are either ungated or whose module is active. */
function filterStepsByModulos(steps, activeModulos) {
  return steps.filter((s) => {
    const moduloId = STEP_TO_MODULO[s.id];
    return !moduloId || activeModulos.includes(moduloId);
  });
}

/** `STEPS_AUTO`, filtered down to the user's active modules (only affects "Fotos"). */
export function getAutoSteps(activeModulos) {
  return filterStepsByModulos(STEPS_AUTO, activeModulos);
}

/** `STEPS_MANUAL`, filtered down to the user's active modules. */
export function getManualSteps(activeModulos) {
  return filterStepsByModulos(STEPS_MANUAL, activeModulos);
}
