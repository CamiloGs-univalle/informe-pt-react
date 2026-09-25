/**
 * db.js
 * ─────────────────────────────────────────────────────────────────────────
 * Low-level persistence layer for the whole app.
 *
 * This project has no real backend: it simulates one with a single
 * in-memory object (`DB`) that is mirrored to `localStorage` on every
 * write. Every entity model (Ejecutivo, Cliente, Informe, Workspace,
 * ModuloConfig) reads and writes through this module — it is the only
 * place that touches `localStorage` for the main dataset.
 *
 * Swapping this for a real backend (REST API, Firestore, etc.) later only
 * requires reimplementing `loadDB` / `saveDB` and the shape of `DB`; every
 * model module above this layer keeps working unchanged.
 */

export const STORAGE_KEY = 'ps_v3';

// ── Seed / demo data ────────────────────────────────────────────────────
// Used only the very first time the app runs on a browser (empty storage).

const DEFAULT_WORKSPACES = [
  { id: 'w1', nombre: 'Proservis Temporales', descripcion: 'Gestión de personal temporal', color: '#168A43' },
  { id: 'w2', nombre: 'Proservis Outsourcing', descripcion: 'Soluciones de outsourcing', color: '#12212D' },
];

const DEFAULT_AREAS = [
  { id: 'a1', workspaceId: 'w1', nombre: 'Selección y Contratación', color: '#E8BB26', modulos: ['seleccion'], adminId: 'e_test_jefe_sel', descripcion: 'Psicólogos - reportes de selección y contratación' },
  { id: 'a2', workspaceId: 'w1', nombre: 'SST', color: '#1A5276', modulos: ['sst', 'sst_tasa', 'sst_severidad', 'sst_investigacion', 'ausentismo'], adminId: 'e_test_jefe_sst', descripcion: 'Seguridad y salud en el trabajo — ISSA Incubadora: Tasa, Severidad, Investigación, Ausentismo' },
  { id: 'a3', workspaceId: 'w1', nombre: 'Atención al Cliente', color: '#12212D', modulos: ['headcount', 'rotacion', 'nomina', 'facturacion', 'clima', 'capacitacion', 'fotos'], adminId: 'e_test_jefe_eje', descripcion: 'Ejecutivos — lideran el informe final y hacen seguimiento de todas las áreas' },
  { id: 'a4', workspaceId: 'w1', nombre: 'Bienestar y Clima', color: '#7A6010', modulos: ['clima', 'capacitacion', 'fotos'], adminId: null, descripcion: 'Bienestar, clima laboral y registro fotográfico' },
  { id: 'a5', workspaceId: 'w2', nombre: 'Operaciones', color: '#12212D', modulos: [], adminId: null, descripcion: 'Área operativa general' },
];

const DEFAULT_EJS = [
  { id: "e0", nom: "Camilo Garcia", email: "camilo.garcia@proservis.com.co", zona: "Bucaramanga", role: "super_admin", password: "Proservis2026", workspaceId: "w1", areaId: "a1", activo: true },
  { id: "e1", nom: "Alejandra Loaiza", email: "ejecutivocali.gh@yupi.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e2", nom: "Andrea Martínez", email: "ejecutivo.cali6@proservis.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e3", nom: "Angie Paola Niño", email: "ejecutivo.girardot@proservis.com.co", zona: "Girardot", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e4", nom: "Claudia Medina", email: "ejecutivo.ibague@proservis.com.co", zona: "Ibague", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e5", nom: "Claudia Sanchez", email: "lider.operativo@proservis.com.co", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e6", nom: "Diana Flor", email: "ejecutivo.promoambiental@proservis.com.co", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e7", nom: "Evelyn Lopez", email: "ejecutivo.cali2@proservis.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e8", nom: "Francisco Castro", email: "gestor.cartagena@proservis.com.co", zona: "Cartagena", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e9", nom: "Ginna Toro", email: "ejecutivo.cali3@proservis.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e10", nom: "Jhon Jairo Cardenas", email: "ejecutivo.thpereira@proservis.com.co", zona: "Pereira", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e11", nom: "Jhonatan Gonzalez", email: "ejecutivo.bogota1@proservis.com.co", zona: "Bogota", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e12", nom: "Johan Andrey Moncada", email: "ejecutivo.buga@proservis.com.co", zona: "Buga", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e13", nom: "Jorge Enciso", email: "jenciso@bancow.com.co", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e14", nom: "Juan David Varela", email: "ejecutivo.integral@proservis.com.co", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e15", nom: "Maria Helena Delgado", email: "ejecutivo.thpasto@proservis.com.co", zona: "Pasto", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e16", nom: "Marian Urueta", email: "ejecutivo.bucaramanga@proservis.com.co", zona: "Bucaramanga", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e17", nom: "Yerly Milena Gomez", email: "ejecutivo.bogota@proservis.com.co", zona: "Bogota", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  // ── USUARIOS DE PRUEBA COLABORATIVO (Señor Camilo solicitó simulación) ──
  { id: "e_test_jefe_sst", nom: "Jefe SST", email: "jefe.sst@proservis.com.co", zona: "Cali", role: "admin", password: "Proservis2026", workspaceId: "w1", areaId: "a2", activo: true },
  { id: "e_test_jefe_sel", nom: "Jefe Selección", email: "jefe.seleccion@proservis.com.co", zona: "Cali", role: "admin", password: "Proservis2026", workspaceId: "w1", areaId: "a1", activo: true },
  { id: "e_test_jefe_eje", nom: "Jefe Atención al Cliente", email: "jefe.ejecutivos@proservis.com.co", zona: "Nacional", role: "admin", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
  { id: "e_test_u_sst", nom: "Ana SST", email: "usuario.sst@proservis.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a2", activo: true },
  { id: "e_sst_daniel", nom: "Daniel Castillo", email: "fisioterapeuta@proservis.com.co", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a2", activo: true },
  { id: "e_sst_derly", nom: "Derly Angelica Velasquez Martinez", email: "asesorbogotasst@gmail.com", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a2", activo: true },
  { id: "e_sst_luis", nom: "Luis Acosta", email: "gestor.seguridad2@proservis.com", zona: "Nacional", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a2", activo: true },
  { id: "e_test_u_sel", nom: "Laura Selección", email: "usuario.seleccion@proservis.com.co", zona: "Cali", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a1", activo: true },
  { id: "e_test_u_eje", nom: "Carlos Atención al Cliente", email: "usuario.ejecutivo@proservis.com.co", zona: "Bogota", role: "usuario", password: "Proservis2026", workspaceId: "w1", areaId: "a3", activo: true },
];

const DEFAULT_CLIS = [
  { id: "c1", nom: "4 PAJAROS S.A.S.", marca: "", nit: "900977113", ciu: "", sec: "", ejId: "e8", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c2", nom: "99 MINUTOS COLOMBIA S.A.S.", marca: "", nit: "901415150", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c3", nom: "AGECOLDA S.A.S.", marca: "", nit: "890311251", ciu: "", sec: "", ejId: "e_test_u_eje", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c4", nom: "AGENCIA DE ADUANAS AGECOLDEX S.A.", marca: "", nit: "800254610", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c5", nom: "AGENCIA SEGUROS S.A.", marca: "", nit: "900074589", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c6", nom: "AGRAF INDUSTRIAL S.A.S.", marca: "", nit: "805017279", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c7", nom: "ALAI S.A.S", marca: "", nit: "860074479", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c8", nom: "ALIMENTOS SKY S.A.S.", marca: "", nit: "9015811507", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c9", nom: "ALUMINIO NACIONAL S.A.", marca: "", nit: "890300213", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c10", nom: "ANCLA Y VIENTO SAS", marca: "", nit: "830026818", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c11", nom: "AYV EXPRESS", marca: "", nit: "830055842", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c12", nom: "BANCO FALABELLA S.A.", marca: "", nit: "900047981", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c13", nom: "BANCO W S.A.", marca: "", nit: "900378212", ciu: "", sec: "", ejId: "e13", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c14", nom: "BGO DISTRIBUIDOR SAS", marca: "", nit: "901932896", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c15", nom: "BURICA S.A.", marca: "", nit: "800130144", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c16", nom: "C.F QBCO S.A.S.", marca: "", nit: "901228788", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c17", nom: "C3 CONSTRUCCIONES Y CONTRATOS ZONA FRANCA S.A.S.", marca: "", nit: "901163868", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c18", nom: "CAJAS COLOMBIANAS S.A.S.", marca: "", nit: "890306240", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c19", nom: "CALZADO TERRANO S.A.S.", marca: "", nit: "900270177", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c20", nom: "CARLOS ALBERTO GIRALDO SALAZAR", marca: "", nit: "1013594236", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c21", nom: "CARVEL S.A . INGENIEROS CONTRATISTAS", marca: "", nit: "890300412", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c22", nom: "CASA DIELECTRICA", marca: "", nit: "730740907", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c23", nom: "CASA ELECTRICA NO. 1", marca: "", nit: "12987992", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c24", nom: "CEMENTOS SAN MARCOS S.A.", marca: "", nit: "900233101", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c25", nom: "CENTRAL DE ABASTECIMIENTOS DEL VALLE DEL CAUCA S.A.", marca: "", nit: "900317814", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c26", nom: "CFT S.A.S. - UNITED", marca: "", nit: "827000595", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c27", nom: "CHAMPUTIZ ACOSTA SEGUNDO HERMES", marca: "", nit: "12982296", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c28", nom: "CHEVRON PETROLEUM COMPANY", marca: "", nit: "860005223", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c29", nom: "CIA INTERNACIONAL ALIMENTOS S.A.", marca: "", nit: "817000747", ciu: "", sec: "", ejId: "e1", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c30", nom: "CLINICA IMBANACO S.A.S.", marca: "", nit: "890307200", ciu: "", sec: "", ejId: "e_test_u_eje", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c31", nom: "COEXITO S.A.", marca: "", nit: "890300225", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c32", nom: "COLDEACEROS SA", marca: "", nit: "900205225", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c33", nom: "COLOMBIANA DE MOLDEADOS S.A.S.", marca: "", nit: "890320250", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c34", nom: "COMERCIALIZADORA MI SUPER", marca: "", nit: "901953101", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c35", nom: "COMPAÑIA DSIERRA S.A.S.", marca: "", nit: "900397839", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c36", nom: "COMPAÑIA NACIONAL DE LEVADURAS LEVAPAN S.A.", marca: "", nit: "890303400", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c37", nom: "CONCENTRADOS DEL SUR LTDA", marca: "", nit: "890900291", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c38", nom: "CONFORT SALUD", marca: "", nit: "", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c39", nom: "CONSULTPPLIE", marca: "", nit: "", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c40", nom: "COOPERATIVA NACIONAL DE DROGUISTAS DETALLISTAS - COOPIDROGAS", marca: "", nit: "890306216", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c41", nom: "COORPORACION MUNCHY S.A.S.", marca: "", nit: "900984565", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c42", nom: "CORPORACION DE TRANSPORTADORES NARIÑENSES S.A.", marca: "", nit: "891200642", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c43", nom: "CRUZ ROJA COLOMB SEC VALLE", marca: "", nit: "890306215", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c44", nom: "DERIVADOS LÁTEOS QBCO S.A.S.", marca: "", nit: "830033723", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c45", nom: "DISTRIBUCION Y TRANSPORTES S.A.", marca: "", nit: "809009050", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c46", nom: "DISTRICARGO OPERATIONS S A COLOMBIA", marca: "", nit: "900927454", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c47", nom: "E.S.M. LOGISTICA S.A.S.", marca: "", nit: "900429481", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c48", nom: "EMBOTELLADORA DE BEBIDAS DEL TOLIMA S.A.", marca: "", nit: "800196667", ciu: "", sec: "", ejId: "e4", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c49", nom: "EMPAQUES DE COLOMBIA EMPACANDO S.A.S.", marca: "", nit: "860530492", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c50", nom: "EQUIMISEG LTDA EXTINTORES QUIMICOS Y SEGURIDAD", marca: "", nit: "805007674", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c51", nom: "ESPEJOS S.A.", marca: "", nit: "900017447", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c52", nom: "FADEPLAST BUGA S.A.S.", marca: "", nit: "900614243", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c53", nom: "FAREVA VILLA RICA S.A.S.", marca: "", nit: "901232631", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c54", nom: "FEXTON S.A.S.", marca: "", nit: "8221002693", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c55", nom: "FONDO DE EMPLEADOS DE SERVICIOS - FONSER", marca: "", nit: "900158592", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c56", nom: "FORSA S.A.", marca: "", nit: "805017818", ciu: "", sec: "", ejId: "e16", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c57", nom: "FULLMINERIA", marca: "", nit: "900161000", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c58", nom: "FUNDACION INSTITUTO MAYOR CAMPESINO", marca: "", nit: "891300587", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c59", nom: "GIRAG S.A.S.", marca: "", nit: "", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c60", nom: "GIRALDO VILLEGAS ELADIO ANTONIO - DISTRIBUCIONES ELDIMI - GRUPO FINESA", marca: "", nit: "15444857", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c61", nom: "GOODYEAR DE COLOMBIA S.A.", marca: "", nit: "890200474", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c62", nom: "GRICOL S.A", marca: "", nit: "830092830", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c63", nom: "GRUPO FINESA", marca: "", nit: "31520036", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c64", nom: "HOUM COLOMBIA S.A.S.", marca: "", nit: "9013931564", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c65", nom: "INCUBADORA SANTANDER USUARIO INDUSTRIAL ZF S.A.S.", marca: "", nit: "900860248", ciu: "", sec: "", ejId: "e16", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c66", nom: "INDUSTRIAS PATOJITO S.A.S.", marca: "", nit: "8170008095", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c67", nom: "INMOBILIARIA RUIZ PEREA", marca: "", nit: "804001357", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c68", nom: "INSTITUTO DE LAS RELIGIOSAS DE SAN JOSE DE GERONA", marca: "", nit: "890301430", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c69", nom: "INTEGRANDO S.A.S.", marca: "", nit: "891411213", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c70", nom: "INVERPACK S.A.S", marca: "", nit: "900334468", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c71", nom: "IPSMEDIC S.A.S.", marca: "", nit: "900138474", ciu: "", sec: "", ejId: "e9", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c72", nom: "ISTITUTO DI CULTURA", marca: "", nit: "830000684", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c73", nom: "IX COMERCIO COLOMBIA S.A.S", marca: "", nit: "901290132", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c74", nom: "JARALEZ S.A.S.", marca: "", nit: "9000738637", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c75", nom: "JCR PACK LIMITED INC", marca: "", nit: "2230625", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c76", nom: "LA ASEGURADORA LTDA", marca: "", nit: "830128078", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c77", nom: "LABORATORIO EDO", marca: "", nit: "900974517", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c78", nom: "LLE SER LIMITADA", marca: "", nit: "8050061418", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c79", nom: "MANITOBA S.A.S.", marca: "", nit: "800024095", ciu: "", sec: "", ejId: "e_test_u_eje", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c80", nom: "MEJIA ALZATE MILLER ALBERTO - DISTRIBUCIONES MILEY", marca: "", nit: "800072656", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c81", nom: "MENDIOLA S.A.S.", marca: "", nit: "890300794", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c82", nom: "MERCADEO EFECTIVO", marca: "", nit: "830135377", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c83", nom: "METALMECANICA PROMOAMBIENTAL S.A.S.", marca: "", nit: "900326523", ciu: "", sec: "", ejId: "e8", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c84", nom: "MOTOR K", marca: "", nit: "901137260", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c85", nom: "NC CONSTRUCTORES S.A.S.", marca: "", nit: "901104914", ciu: "", sec: "", ejId: "e15", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c86", nom: "NECSOFTPC SAS", marca: "", nit: "900268588", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c87", nom: "NOPIN DE COLOMBIA", marca: "", nit: "900416025", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c88", nom: "NOVELTEX S.A.S.", marca: "", nit: "900349093", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c89", nom: "NOVOMATIC SAS", marca: "", nit: "830083714", ciu: "", sec: "", ejId: "e5", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c90", nom: "ONZE INVERSIONES S.A.S. - GRUPO FINESA", marca: "", nit: "901551302", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c91", nom: "OPERACIONES BLACKROOM S.A.S.", marca: "", nit: "901623666", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c92", nom: "OPERCOMEX S.A.S.", marca: "", nit: "815000524", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c93", nom: "PACARIBE S.A. E.S.P", marca: "", nit: "805006362", ciu: "", sec: "", ejId: "e8", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c94", nom: "PACARIBE S.A. E.S.P", marca: "", nit: "900332590", ciu: "", sec: "", ejId: "e8", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c95", nom: "PANADERIA MONTECARLO", marca: "", nit: "", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c96", nom: "PARABOR COLOMBIA", marca: "", nit: "800159219", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c97", nom: "PLASTIC FILMS IN S.A.", marca: "", nit: "800220225", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c98", nom: "PLASTICOS FARALLONES S.A.", marca: "", nit: "805031358", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c99", nom: "POSITIVO GROUP S.A.S.", marca: "", nit: "900227153", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c100", nom: "PROADHESIVOS SAS", marca: "", nit: "805003151-8", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c101", nom: "PRODUCE SOCIEDAD POR ACCIONES SIMPLIFICADA", marca: "", nit: "9003620022", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c102", nom: "PRODUCTOS ALIMENTICIOS LA LOCURA S.A.S.", marca: "", nit: "890328444", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c103", nom: "PRODUCTOS YUPI S.A.S.", marca: "", nit: "890315540", ciu: "", sec: "", ejId: "e1", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c104", nom: "PRODUCTOS YUPI S.A.S.", marca: "", nit: "890315540-8", ciu: "", sec: "", ejId: "e1", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c105", nom: "PROMOCALI S.A. ESP", marca: "", nit: "814006870", ciu: "", sec: "", ejId: "e6", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c106", nom: "PROMOVALLE S.A. ESP", marca: "", nit: "800084048", ciu: "", sec: "", ejId: "e6", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c107", nom: "PUERTO 125 S.A.S.", marca: "", nit: "901223597", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c108", nom: "QBCO S.A.S.", marca: "", nit: "800012375", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c109", nom: "RANPACK SAS", marca: "", nit: "900742601", ciu: "", sec: "", ejId: "e9", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c110", nom: "RED VITAL TOTAL", marca: "", nit: "901861169", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c111", nom: "REDES LOGICAS LFC S.A.S.", marca: "", nit: "900942390", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c112", nom: "RYG ASOCIADOS", marca: "", nit: "805016873", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c113", nom: "SANTIPOLLO SAS", marca: "", nit: "901128762", ciu: "", sec: "", ejId: "e12", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c114", nom: "SEGURIDAD ATLAS LTDA", marca: "", nit: "890312749", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c115", nom: "SIAMO SERVICIOS S.A.S.", marca: "", nit: "800155500", ciu: "", sec: "", ejId: "e16", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c116", nom: "SLA INVERSIONES S.A.S.", marca: "", nit: "901901535", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c117", nom: "SYSTEMPACK LIMITADA", marca: "", nit: "800103864", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c118", nom: "TAESCOL S.A.S.", marca: "", nit: "800136926", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c119", nom: "TALTON INTERNACIONAL", marca: "", nit: "830030574", ciu: "", sec: "", ejId: "e17", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_derly"} },
  { id: "c120", nom: "TEXTILES NGA SAS", marca: "", nit: "900601204", ciu: "", sec: "", ejId: "e11", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c121", nom: "TRAPICHE LA CAMELIA DEL CAUCA S.A.S.", marca: "", nit: "860026123", ciu: "", sec: "", ejId: "e16", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c122", nom: "TURK HOUSE S.A.S.", marca: "", nit: "900962695", ciu: "", sec: "", ejId: "e14", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_daniel"} },
  { id: "c123", nom: "VATIA S.A.S.", marca: "", nit: "817001892", ciu: "", sec: "", ejId: "e7", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c124", nom: "VEEVART S.A.S.", marca: "", nit: "901160406", ciu: "", sec: "", ejId: "e10", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"} },
  { id: "c125", nom: "VITAFITNESS S.A.S.", marca: "", nit: "901464041", ciu: "", sec: "", ejId: "e16", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
  { id: "c126", nom: "VITRALUX WINDOWS SAS.", marca: "", nit: "900717629", ciu: "", sec: "", ejId: "e2", logo: null, driveFolder: "", workspaceId: "w1", asignaciones: {"a1":"e_test_u_sel","a2":"e_sst_luis"} },
];

/**
 * The single in-memory "database" object. Exported by reference so model
 * modules can read/mutate its arrays directly and call `saveDB()` to persist.
 */
export const DB = { ejs: [], clis: [], infs: [], workspaces: [], areas: [], moduloConfigs: {}, contribuciones: [] };

/** Persists the current `DB` snapshot to localStorage (best-effort). */
export function saveDB() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); } catch (e) { /* storage unavailable (e.g. private mode) */ }
}

/** Reads the raw snapshot from localStorage into `DB` (best-effort). */
function readFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const p = JSON.parse(s);
      DB.ejs = p.ejs || [];
      DB.clis = (p.clis || []).map(c => ({ asignaciones: {"a1":"e_test_u_sel","a2":"e_test_u_sst"}, ...c }));
      DB.infs = p.infs || [];
      DB.workspaces = p.workspaces || [];
      DB.areas = (p.areas || []).map(a => ({ modulos: [], adminId: null, descripcion: '', ...a }));
      DB.moduloConfigs = p.moduloConfigs || {};
      DB.contribuciones = p.contribuciones || [];
    }
  } catch (e) { /* ignore corrupt storage */ }
}

/**
 * Re-seeds any empty collection with the demo/default data, and migrates
 * Ejecutivo records saved by older versions of the app (missing
 * role/password/workspace fields), guaranteeing at least one super_admin
 * exists. Idempotent — safe to run against already-migrated data.
 */
function migrateAndSeed() {
  if (!DB.ejs.length) {
    DB.ejs = JSON.parse(JSON.stringify(DEFAULT_EJS));
  } else {
    DB.ejs = DB.ejs.map(u => ({
      role: 'usuario',
      password: 'Proservis2026',
      workspaceId: 'w1',
      areaId: 'a1',
      activo: true,
      ...u,
      email: u.email || (u.nom || '').toLowerCase().replace(/\s+/g, '.') + '@proservis.co',
    }));
    // Ensure at least one super_admin exists.
    if (!DB.ejs.some(u => u.role === 'super_admin')) {
      const first = DB.ejs[0];
      if (first) first.role = 'super_admin';
      else DB.ejs.unshift(DEFAULT_EJS[0]);
    }
  }
  if (!DB.workspaces.length) DB.workspaces = JSON.parse(JSON.stringify(DEFAULT_WORKSPACES));
  if (!DB.areas.length) DB.areas = JSON.parse(JSON.stringify(DEFAULT_AREAS));
  else {
    const seedById = Object.fromEntries(DEFAULT_AREAS.map(a => [a.id, a]));
    DB.areas = DB.areas.map(a => {
      const seed = seedById[a.id];
      if (!seed) return a;
      if (a.id === 'a3') {
        return { ...a, nombre: seed.nombre, modulos: seed.modulos, descripcion: seed.descripcion, color: seed.color, adminId: a.adminId || seed.adminId };
      }
      if (a.id === 'a2') {
        return { ...a, nombre: seed.nombre, modulos: seed.modulos, descripcion: seed.descripcion, color: seed.color, adminId: a.adminId || seed.adminId };
      }
      return { modulos: seed.modulos || [], adminId: a.adminId || null, descripcion: a.descripcion || seed.descripcion || '', ...a, modulos: a.modulos || seed.modulos || [] };
    });
    DEFAULT_AREAS.forEach(sa => { if (!DB.areas.find(a => a.id === sa.id)) DB.areas.push(JSON.parse(JSON.stringify(sa))); });
    // Forzar que a3 siempre sea Ejecutivos aunque venga con nombre viejo
    const a3 = DB.areas.find(a=>a.id==='a3');
    if (a3 && a3.nombre !== 'Ejecutivos') { a3.nombre='Ejecutivos'; a3.modulos=['headcount','rotacion','nomina','facturacion','clima','capacitacion','fotos']; a3.descripcion='Ejecutivos — lideran el informe final y hacen seguimiento de todas las áreas'; }
  }
  if (!DB.clis.length) DB.clis = JSON.parse(JSON.stringify(DEFAULT_CLIS));
  else if (DB.clis.length < 50) { // seed update: merge new clients without duplicating by nit/nom
    const existingKeys = new Set(DB.clis.map(c => (c.nit ? "NIT:"+String(c.nit).replace(/[\s\.\-]/g,"") : "NAME:"+String(c.nom).toLowerCase())));
    DEFAULT_CLIS.forEach(c => {
      const key = c.nit ? "NIT:"+String(c.nit).replace(/[\s\.\-]/g,"") : "NAME:"+String(c.nom).toLowerCase();
      if (!existingKeys.has(key)) DB.clis.push(JSON.parse(JSON.stringify(c)));
    });
  }
  // Ejecutivos seed merge similarly
  if (DB.ejs.length < 10) {
    const existingEmails = new Set(DB.ejs.map(e => String(e.email).toLowerCase()));
    DEFAULT_EJS.forEach(e => { if (!existingEmails.has(String(e.email).toLowerCase())) DB.ejs.push(JSON.parse(JSON.stringify(e))); });
  }
  if (!DB.moduloConfigs) DB.moduloConfigs = {};
  if (!DB.contribuciones) DB.contribuciones = [];
  // Migración: mover ejecutivos (usuarios que son ejId de algún cliente) al área Ejecutivos (a3)
  try {
    const ejecutivoIds = new Set(DB.clis.map(c=>c.ejId).filter(Boolean));
    DB.ejs.forEach(u=>{
      if (ejecutivoIds.has(u.id) && u.areaId !== 'a3' && u.role !== 'super_admin') {
        // Solo si no es ya de SST/Selección con asignaciones específicas de prueba, mover a Ejecutivos
        // Para demo, mover a todos los que son ejecutivos de clientes reales
        if (u.id.startsWith('e') && !u.id.startsWith('e_test_')) {
          u.areaId = 'a3';
        }
      }
    });
    // Asegurar que los 3 de prueba ejecutivos queden en a3
    const fix = (id, area)=>{ const u=DB.ejs.find(x=>x.id===id); if(u) u.areaId=area; };
    fix('e_test_u_eje','a3');
    fix('e_test_jefe_eje','a3');
  } catch {}
  // Migración masiva: asegurar que cada cliente tenga trío ejecutivo + selección + SST
  try {
    DB.clis.forEach(c=>{
      if (!c.asignaciones) c.asignaciones={};
      if (!c.asignaciones['a1']) c.asignaciones['a1']='e_test_u_sel';
      if (!c.asignaciones['a2']) c.asignaciones['a2']='e_test_u_sst';
      // ejId ya existe, es el ejecutivo que termina
    });
  } catch {}
  // ── SEED HISTÓRICO demo (últimos 3 meses) para que la plataforma se vea funcional ──
  if (!DB.infs.length && DB.clis.length && DB.areas.length) {
    const periodos = ['2026-06','2026-07','2026-08'];
    const demoClis = ['c3','c30','c79','c1','c2','c6','c13','c48','c103','c115'];
    const rand = (min,max)=> Math.floor(Math.random()*(max-min+1))+min;
    periodos.forEach(per => {
      demoClis.forEach(cliId => {
        const cli = DB.clis.find(c=>c.id===cliId);
        if (!cli) return;
        const ej = DB.ejs.find(e=>e.id===cli.ejId) || DB.ejs[0];
        // contribuciones por área
        DB.areas.forEach(area => {
          if (!area.modulos || !area.modulos.length) return;
          // solo para demo: si es periodo 2026-08 dejar 1 área pendiente para mostrar semáforo mixto
          const esPendienteDemo = per==='2026-08' && cliId==='c79' && area.id==='a2';
          const estado = esPendienteDemo ? 'pendiente' : (Math.random()>0.15 ? 'validado' : 'completado');
          const datos = {};
          if (area.modulos.includes('seleccion')) {
            const sol = rand(3,8); const con = rand(2,sol);
            datos.seleccion = [{rq:`RQ-${per.slice(5)}-01`, agencia: cli.nom.slice(0,8), ciudad: 'Cali', cargo:'Operario', solicitadas:sol, contratadas:con, oportunidad: rand(70,95), tiempoRespuesta: rand(3,9), estado:'Cubierta'}];
          }
          if (area.modulos.includes('sst')) {
            datos.sst = { indicadores:{at: rand(0,1), oc: rand(0,1), maternidad:0, eg: rand(0,5), arl:100, inducciones: rand(1,4)}, casos:[] };
            datos.ausentismo = { horas: rand(20,80), eventos: rand(1,4), tasa: (Math.random()*3).toFixed(1), diasPerdidos: rand(2,10), causas:'Gripa', obs:'' };
          }
          if (area.modulos.includes('headcount')) {
            const ini = rand(40,80); const ing = rand(2,6); const ret = rand(1,4);
            datos.headcount = { inicio: ini, ingresos: ing, retiros: ret };
            datos.rotacion = [{motivo:'Renuncia voluntaria', cantidad: ret}];
            datos.nomina = { liquidados: ini+ing-ret, incapacidades: rand(0,2), licencias:0, heDiurnas: rand(5,20), heNocturnas:0, errores:0, observaciones:'' };
            datos.facturacion = { valor: rand(50000000, 90000000), costo: rand(40000000, 70000000), margen: rand(12,18), cartera: rand(15,30), estado:'Al día', cumplimiento: rand(95,100), obs:'' };
          }
          if (area.modulos.includes('clima')) {
            datos.clima = { satisfaccion: rand(75,92), enps: rand(30,60), participacion: rand(70,90), actividades: rand(1,3), encuesta:'Buen ambiente', plan:'' };
            datos.capacitacion = { horas: rand(10,30), personas: rand(8,20), cobertura: rand(70,95), temas:[{tema:'Seguridad', asistentes:10, horas:4}], obs:'' };
            datos.fotos = {};
          }
          if (!esPendienteDemo) {
            DB.contribuciones.push({ id:`ct_${per}_${cliId}_${area.id}`, cliId, per, areaId: area.id, userId: cli.asignaciones?.[area.id] || ej.id, estado, datos, createdAt: new Date(per+'-05').toISOString(), updatedAt: new Date(per+'-10').toISOString() });
          }
        });
        // informe final para ese cliente+periodo (solo si no es el pendiente demo)
        if (!(per==='2026-08' && demoClis.indexOf(cliId)>=8)) {
          const perLabel = per;
          DB.infs.push({ id:`i_${per}_${cliId}`, cliId, per, ejId: ej.id, ejNom: ej.nom, cliNom: cli.nom, html:`<html><body><h1>Informe ${cli.nom} ${per}</h1><p>Demo histórico</p></body></html>`, headcount:{inicio:50, ingresos:3, retiros:2}, seleccion:[], rotacion:[], sst:{indicadores:{at:0}, casos:[]}, nomina:{}, fotos:{}, ausentismo:{}, capacitacion:{}, clima:{}, facturacion:{}, activeModules:['seleccion','sst','headcount'], rating: per==='2026-07'?5: per==='2026-06'?4:null, feedback: per==='2026-07'?'Excelente informe':'' , ts: new Date(per+'-15').toISOString() });
        }
      });
    });
    // also generate algunos pendientes para 2026-09 para que el tablero actual se vea vivo
    const perActual='2026-09';
    ['c3','c30','c79'].forEach(cliId=>{
      const cli=DB.clis.find(c=>c.id===cliId);
      const ej=DB.ejs.find(e=>e.id===cli.ejId)||DB.ejs[0];
      // a1 completado, a2 pendiente for c30 to show mix
      if (cliId==='c30') {
        DB.contribuciones.push({ id:`ct_${perActual}_${cliId}_a1`, cliId, per:perActual, areaId:'a1', userId: cli.asignaciones?.['a1']||ej.id, estado:'completado', datos:{ seleccion:[{rq:'RQ-09-01', solicitadas:4, contratadas:3, oportunidad:75, tiempoRespuesta:7}]}, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()});
        // a2 queda pendiente
      } else if (cliId==='c3') {
        DB.contribuciones.push({ id:`ct_${perActual}_${cliId}_a1`, cliId, per:perActual, areaId:'a1', userId: cli.asignaciones?.['a1']||ej.id, estado:'completado', datos:{ seleccion:[{rq:'RQ-09-01', solicitadas:5, contratadas:5, oportunidad:90, tiempoRespuesta:4}]}, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()});
        DB.contribuciones.push({ id:`ct_${perActual}_${cliId}_a2`, cliId, per:perActual, areaId:'a2', userId: cli.asignaciones?.['a2']||ej.id, estado:'completado', datos:{ sst:{indicadores:{at:0, oc:0}}}, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString()});
      }
    });
  }
}

/**
 * Loads `DB` from localStorage, migrates/re-seeds it as needed, and
 * persists the result. Safe to call multiple times (e.g. on route
 * re-entry) — this is also what runs once at module-load time (below) so
 * that `getEjs()` etc. always have data available, even before the view
 * layer calls `loadDB()` again from `App.jsx`.
 */
export function loadDB() {
  readFromStorage();
  migrateAndSeed();
  saveDB();
}

loadDB();
