/**
 * constants.js
 * ─────────────────────────────────────────────────────────────────────────
 * Static, non-persisted domain constants: roles, module catalog and the
 * fixed dropdown options used across the "Nuevo informe" wizard.
 *
 * These values never change at runtime, so they live outside of `db.js`
 * (the persisted store) and can be imported by any layer (models,
 * controllers or views) without creating circular dependencies.
 */

/** Role identifiers used throughout the app (stored on each Atención al Cliente). */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USUARIO: 'usuario',
};

/** Human-readable label for each role, used in badges and selects. */
export const ROLE_LABEL = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  usuario: 'Usuario',
};

/** Longer description of what each role can do (shown in help text). */
export const ROLE_DESC = {
  super_admin: 'Crea espacios y áreas. Acceso total.',
  admin: 'Crea personas, asigna clientes y ve seguimiento del equipo.',
  usuario: 'Configura módulos y genera reportes por cliente.',
};

/** Catalog of report modules a Usuario can toggle on/off. */
export const MODULOS = [
  { id: 'headcount', label: 'Headcount', icon: '👥', desc: 'Movimiento de personal' },
  { id: 'seleccion', label: 'Selección', icon: '🎯', desc: 'Requerimientos y contrataciones' },
  { id: 'rotacion', label: 'Rotación', icon: '↻', desc: 'Motivos de retiro' },
  { id: 'sst', label: 'SST', icon: '🛡️', desc: 'Seguridad y salud en el trabajo' },
  { id: 'sst_tasa', label: 'Tasa Accidentalidad', icon: '📈', desc: 'Tasa por sede (Nacional, Cauca, Santander)' },
  { id: 'sst_severidad', label: 'Severidad', icon: '⚠️', desc: 'Días perdidos por AT' },
  { id: 'sst_investigacion', label: 'Investigación AT', icon: '🔍', desc: 'Cumplimiento investigación' },
  { id: 'nomina', label: 'Nómina', icon: '💰', desc: 'Liquidaciones y novedades' },
  { id: 'ausentismo', label: 'Ausentismo', icon: '⏰', desc: 'Incapacidades y ausencias' },
  { id: 'capacitacion', label: 'Capacitación', icon: '🎓', desc: 'Formación y entrenamiento' },
  { id: 'clima', label: 'Clima Laboral', icon: '😊', desc: 'Bienestar y satisfacción' },
  { id: 'facturacion', label: 'Facturación', icon: '🧾', desc: 'Indicadores financieros' },
  { id: 'fotos', label: 'Fotos', icon: '📷', desc: 'Registro fotográfico' },
];

/** Predefined "motivo de retiro" options for the Rotación module. */
export const MOTIVOS_PRE = [
  'Terminación de la obra o labor', 'Renuncia voluntaria',
  'Renuncia por equilibrio trabajo/vida personal', 'Abandono de cargo',
  'Paso de temporal al cliente', 'Período de prueba', 'Mutuo acuerdo', 'Otro',
];

/** Fixed labels for the 9 activity-photo slots in the Fotos module. */
export const FOTOLABELS = [
  'Inducción SST', 'Capacitación', 'Inspección EPP', 'Actividad bienestar',
  'Visita al cliente', 'Otra actividad', 'Actividad 7', 'Actividad 8', 'Actividad 9',
];
