/**
 * views/pages/NuevoInforme.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Multi-step wizard to build a monthly Informe, either "automático"
 * (upload/Drive Excel files, auto-extracted) or "manual" (field by field).
 *
 * This view owns the wizard's state (current step, form fields) and all
 * the handlers that mutate it. Actual data assembly (building the report
 * HTML, the export filename and persisting the finished Informe) is
 * delegated to `controllers/informeController.js`, and Excel parsing to
 * `services/excel.service.js`. The rendering for each step lives in its
 * own file under `views/pages/nuevo-informe/` — this file wires state and
 * handlers to whichever step is current, it doesn't render step markup
 * itself. See docs/ARCHITECTURE.md §7 for why this was split out.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClisForEj, getClisVisiblesParaUsuario, getCliFolder } from '../../models/Cliente';
import { getInfsForCliPeriodo } from '../../models/Informe';
import { getEj } from '../../models/Ejecutivo';
import { getModuloConfig, getModuloConfigForClient } from '../../models/ModuloConfig';
import { useToast } from '../common/useToast';
import { buildInformePreviewHtml, buildInformeFileName, saveInforme } from '../../controllers/informeController';
import { parseMultipleExcels, mergeExcelData, extractHeadcount, extractSeleccion, extractRotacion, extractSST, extractNomina, generateDataReport, extractAusentismo, extractCapacitacion, extractFacturacion } from '../../services/excel.service';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import { generateInformePPTX, downloadPPTX } from '../../services/pptxReport.service';
import { getContribucionesForClientePeriodo, getContribucion, saveContribucion, ESTADOS } from '../../models/Contribucion';
import { fusionarContribuciones, getArea as getAreaWF } from '../../controllers/workflowController';
import { DB } from '../../models/db';
import { MODULOS } from '../../models/constants';
import { getCli } from '../../models/Cliente';
import { getAutoSteps, getManualSteps } from './nuevo-informe/steps';
import ModeSelect from './nuevo-informe/ModeSelect';
import StepIndicator from './nuevo-informe/StepIndicator';
import ActiveModulosBanner from './nuevo-informe/ActiveModulosBanner';
import StepCliente from './nuevo-informe/StepCliente';
import StepDriveUpload from './nuevo-informe/StepDriveUpload';
import StepRevisarDatos from './nuevo-informe/StepRevisarDatos';
import StepAjustarDatos from './nuevo-informe/StepAjustarDatos';
import StepHeadcount from './nuevo-informe/StepHeadcount';
import StepSeleccion from './nuevo-informe/StepSeleccion';
import StepRotacion from './nuevo-informe/StepRotacion';
import StepSST from './nuevo-informe/StepSST';
import StepNomina from './nuevo-informe/StepNomina';
import StepAusentismo from './nuevo-informe/StepAusentismo';
import StepCapacitacion from './nuevo-informe/StepCapacitacion';
import StepClima from './nuevo-informe/StepClima';
import StepFacturacion from './nuevo-informe/StepFacturacion';
import StepFotos from './nuevo-informe/StepFotos';
import StepPreview from './nuevo-informe/StepPreview';
import StepExport from './nuevo-informe/StepExport';

const emptyRQ = () => ({ rq: '', agencia: '', ciudad: '', cargo: '', solicitadas: 0, contratadas: 0, oportunidad: 0, tiempoRespuesta: 0, diasCobertura: 0, estado: '', nota: '' });
const emptyMotivo = () => ({ motivo: '', cantidad: 0 });
const emptyCaso = () => ({ nombre: '', identificacion: '', cie10: '', fechaInicio: '', origen: 'AT laboral', ciudad: '', estado: 'Abierto', seguimiento: '' });

export default function NuevoInforme({ ejId, user }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [ejecutivo, setEjecutivo] = useState(null);
  const [clientes, setClientes] = useState([]);

  const [cliId, setCliId] = useState('');
  const [periodo, setPeriodo] = useState('');
  // Reservado para un futuro logo personalizado del informe (hoy siempre
  // usa el logo del cliente); no hay UI todavía para cambiarlo, por eso no
  // tiene setter.
  const [logo] = useState(null);

  const [headcount, setHeadcount] = useState({ inicio: 0, ingresos: 0, retiros: 0 });
  const [seleccion, setSeleccion] = useState([]);
  const [rotacion, setRotacion] = useState([]);
  const [sst, setSst] = useState({ indicadores: {}, casos: [] });
  const [nomina, setNomina] = useState({});
  const [ausentismo, setAusentismo] = useState({ horas: 0, eventos: 0, tasa: 0, diasPerdidos: 0, causas: '', obs: '' });
  const [capacitacion, setCapacitacion] = useState({ horas: 0, personas: 0, cobertura: 0, temas: [], obs: '' });
  const [clima, setClima] = useState({ satisfaccion: 0, enps: 0, participacion: 0, actividades: 0, encuesta: '', plan: '' });
  const [facturacion, setFacturacion] = useState({ valor: 0, costo: 0, margen: 0, cartera: 0, estado: 'Al día', cumplimiento: 100, obs: '' });
  const [fotos, setFotos] = useState({});
  const [obs, setObs] = useState('');

  const [parsedFiles, setParsedFiles] = useState([]);
  const [dataReport, setDataReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);

  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);

  // ── PERMISOS POR ÁREA + FILTRO GLOBAL (corregido Señor) ──
  const ALL_MODULOS = MODULOS.map(m=>m.id);
  const getBaseAllowed = () => {
    if (!user) return [];
    if (user.role === 'super_admin') {
      const cfg = getModuloConfig(user.id);
      const cliCfg = cliId ? getModuloConfigForClient(user.id, cliId) : null;
      const active = cliCfg || cfg;
      if (active && Object.values(active).some(v=>v===false)) {
        const sel = Object.entries(active).filter(([,v])=>v).map(([k])=>k);
        if (sel.length) return sel;
      }
      return ALL_MODULOS;
    }
    // EJECUTIVO LÍDER del cliente — SIEMPRE ve TODO (respeta solo su config global)
    // Es quien ordena, hace seguimiento y saca el informe final, aunque su área sea Selección/SST
    if (cliId) {
      const cli = getCli(cliId);
      if (cli && cli.ejId === user.id) {
        const cfg = getModuloConfig(user.id);
        const cliCfg = getModuloConfigForClient(user.id, cliId);
        const active = cliCfg || cfg;
        if (active && Object.values(active).some(v=>v===false)) {
          const sel = Object.entries(active).filter(([,v])=>v).map(([k])=>k);
          if (sel.length) return sel;
        }
        return ALL_MODULOS;
      }
    }
    if (user.role === 'admin') {
      const areasAdmin = DB.areas.filter(a => a.adminId === user.id);
      if (areasAdmin.length) return [...new Set(areasAdmin.flatMap(a=>a.modulos||[]))];
    }
    if (user.areaId) {
      const area = DB.areas.find(a=>a.id===user.areaId);
      if (area && area.modulos && area.modulos.length) return area.modulos;
    }
    // Fallback legacy
    const moduloCfg = getModuloConfig(user.id);
    const cliModuloCfg = cliId ? getModuloConfigForClient(user.id, cliId) : null;
    const cfgActive = cliModuloCfg || moduloCfg;
    if (cfgActive) {
      const active = Object.entries(cfgActive).filter(([,v])=>v).map(([k])=>k);
      if (active.length) return active;
    }
    return ALL_MODULOS;
  };
  const baseAllowed = getBaseAllowed();
  // Intersección con config global (si el usuario desactivó módulos globalmente, se respetan)
  const getGlobalActive = () => {
    const cfg = getModuloConfig(user?.id);
    const cliCfg = cliId ? getModuloConfigForClient(user.id, cliId) : null;
    const activeCfg = cliCfg || cfg;
    if (!activeCfg) return null;
    const hasFalse = Object.values(activeCfg).some(v=>v===false);
    if (!hasFalse) return null; // todo activo -> no filtrar
    return Object.entries(activeCfg).filter(([,v])=>v).map(([k])=>k);
  };
  const globalActive = getGlobalActive();
  const allowedModulos = globalActive ? baseAllowed.filter(m=> globalActive.includes(m)) : baseAllowed;

  const isEjecutivoDelCliente = !!(cliId && getCli(cliId)?.ejId === user?.id);
  const isSuper = user?.role === 'super_admin';
  const canEditAll = isSuper || isEjecutivoDelCliente;

  const stepsRaw = mode === 'auto' ? getAutoSteps(allowedModulos) : getManualSteps(allowedModulos);
  const steps = stepsRaw;
  const esWorker = !canEditAll && allowedModulos.length && allowedModulos.length < ALL_MODULOS.length;

  const stepIdx = Object.fromEntries(steps.map((s, i) => [s.id, i]));
  const previewStepIdx = stepIdx.preview;

  useEffect(() => {
    if (!ejId) return;
    const vis = getClisVisiblesParaUsuario(user);
    const baseList = (user?.role === 'super_admin' || vis.length) ? vis : getClisForEj(ejId);
    let lista = baseList;
    // Si hay periodo seleccionado, ocultar los ya completados para ese periodo (pero mantener el seleccionado)
    if (periodo) {
      const esWorkerArea = !!user?.areaId && DB.areas.find(a=>a.id===user.areaId)?.modulos?.length;
      if (esWorkerArea) {
        lista = baseList.filter(c => {
          if (c.id === cliId) return true; // mantener el ya seleccionado
          const ct = getContribucion(c.id, periodo, user.areaId);
          if (!ct) return true;
          return [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO, ESTADOS.RECHAZADO].includes(ct.estado);
        });
      } else {
        lista = baseList.filter(c => {
          if (c.id === cliId) return true;
          const yaTiene = getInfsForCliPeriodo(c.id, periodo).length > 0;
          return !yaTiene;
        });
      }
    }
    setClientes(lista);
    setEjecutivo(getEj(ejId));
  }, [ejId, periodo, user]);

  useEffect(() => {
    try {
      const pre = localStorage.getItem('nuevo_cli_preseleccion');
      if (pre && !cliId) {
        setCliId(pre);
        localStorage.removeItem('nuevo_cli_preseleccion');
        toast('Cliente preseleccionado desde Mis clientes Señor ✓');
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (cliId && periodo) {
      const existing = getCliFolder(cliId);
      if (existing) toast('Ruta de carpeta recordada: ' + existing);
    }
  }, [cliId, periodo, toast]);

  const processFiles = useCallback(async (files) => {
    setUploading(true);
    try {
      const parsed = await parseMultipleExcels(files);
      setParsedFiles(parsed);
      const merged = mergeExcelData(parsed);
      // Extraer todo
      const hc = extractHeadcount(merged.headcount);
      const sel = extractSeleccion(merged.seleccion);
      const rot = extractRotacion(merged.rotacion);
      let sstData;
      if (merged._is_issa && merged.db_issa) {
        // ISSA — fuente real SST, extrae por periodo (mes)
        sstData = extractSST([], {db_issa: merged.db_issa, at_issa: merged.at_issa, periodo});
      } else {
        sstData = extractSST(merged.sst);
      }
      const nom = extractNomina(merged.nomina);
      // Nuevos extractores
      let aus = { horas:0, eventos:0, tasa:0, diasPerdidos:0, causas:'', obs:'' };
      let cap = { horas:0, personas:0, cobertura:0, temas:[], obs:'' };
      let fac = { valor:0, costo:0, margen:0, cartera:0, estado:'Al día', cumplimiento:100, obs:'' };
      try {
        if (merged.ausentismo) aus = extractAusentismo(merged.ausentismo) || aus;
        if (merged.capacitacion) { const temas = extractCapacitacion(merged.capacitacion); if (temas && temas.length) cap = { ...cap, temas }; }
        if (merged.facturacion) fac = extractFacturacion(merged.facturacion) || fac;
      } catch {}
      // Filtrado por permisos: si es worker, solo carga lo de su área
      const canAll = isSuper || isEjecutivoDelCliente;
      const allowed = new Set(allowedModulos);
      const shouldLoad = (mid) => canAll || allowed.has(mid);
      if (shouldLoad('headcount')) setHeadcount(hc);
      if (shouldLoad('seleccion')) setSeleccion(sel.length ? sel : [emptyRQ()]);
      if (shouldLoad('rotacion')) setRotacion(rot.length ? rot : [emptyMotivo()]);
      if (shouldLoad('sst')) setSst(sstData);
      if (shouldLoad('nomina')) setNomina(nom);
      if (shouldLoad('ausentismo')) setAusentismo(aus);
      if (shouldLoad('capacitacion')) setCapacitacion(cap);
      if (shouldLoad('facturacion')) setFacturacion(fac);
      const report = generateDataReport(merged);
      setDataReport(report);
      if (!canAll) {
        const cargados = [];
        if (shouldLoad('seleccion') && sel.length) cargados.push('Selección');
        if (shouldLoad('sst') && (sstData.indicadores?.at||sstData.casos?.length)) cargados.push('SST');
        if (cargados.length) toast(`${parsed.length} archivo(s) — solo cargado: ${cargados.join(', ')} (tu área)`);
        else toast(`${parsed.length} archivo(s) procesado(s) — sin datos de tu área, verifica la hoja`);
      } else {
        toast(`${parsed.length} archivo(s) procesado(s)`);
      }
    } catch (e) { toast('Error al procesar archivos: ' + e.message); }
    setUploading(false);
  }, [toast, allowedModulos, isSuper, isEjecutivoDelCliente]);

  const handleLocalUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
  };

  const handleDriveFiles = async (files) => {
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
    if (mode === 'auto') setStep(stepIdx.parse);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files || e.dataTransfer.files).filter(f => f.name.match(/\.(xlsx|xls|csv)$/i));
    if (!files.length) { toast('Solo se aceptan archivos Excel'); return; }
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
  };

  const generatePreview = () => {
    // Si hay contribuciones colaborativas para este cliente/periodo, fusionarlas (el Ejecutivo ve todo)
    let h = headcount, s = seleccion, r = rotacion, ss = sst, n = nomina, a = ausentismo, cap = capacitacion, cl = clima, fac = facturacion, f = fotos;
    try {
      const contribs = getContribucionesForClientePeriodo(cliId, periodo);
      if (contribs && contribs.length) {
        const fused = fusionarContribuciones(cliId, periodo);
        if (fused.seleccion && fused.seleccion.length) s = fused.seleccion;
        if (fused.rotacion && fused.rotacion.length) r = fused.rotacion;
        if (fused.sst && Object.keys(fused.sst).length) ss = fused.sst;
        if (fused.nomina && Object.keys(fused.nomina).length) n = fused.nomina;
        if (fused.headcount && (fused.headcount.inicio||fused.headcount.ingresos)) h = fused.headcount;
        if (fused.ausentismo && Object.keys(fused.ausentismo).length) a = fused.ausentismo;
        if (fused.capacitacion && Object.keys(fused.capacitacion).length) cap = fused.capacitacion;
        if (fused.clima && Object.keys(fused.clima).length) cl = fused.clima;
        if (fused.facturacion && Object.keys(fused.facturacion).length) fac = fused.facturacion;
        if (fused.fotos && Object.keys(fused.fotos).length) f = fused.fotos;
      }
    } catch {}
    const html = buildInformePreviewHtml({ cliId, periodo, ejecutivo, headcount: h, sst: ss, nomina: n, obs, seleccion: s, rotacion: r, fotos: f, logo, ausentismo: a, capacitacion: cap, clima: cl, facturacion: fac, activeModules: allowedModulos });
    setPreviewHtml(html);
    if (getContribucionesForClientePeriodo(cliId, periodo).length) toast('Vista fusionada con aportes de áreas ✓');
  };

  const getFileName = (ext) => buildInformeFileName(cliId, periodo, ext);

  const handleExportHTML = () => { downloadHTML(previewHtml, getFileName('html')); toast('HTML descargado'); };
  const handleExportPDF = async () => {
    setGenerating(true);
    try { await generatePDF(previewHtml, getFileName('pdf')); toast('PDF descargado'); }
    catch (e) { toast('Error al generar PDF'); }
    setGenerating(false);
  };
  const handleExportPPTX = async () => {
    if (!cliId || !periodo) { toast('Seleccione cliente y periodo'); return; }
    setGenerating(true);
    try {
      const cli = clientes.find(c => String(c.id) === String(cliId)) || {};
      const { blob, fileName } = await generateInformePPTX({ cliId, periodo, ejecutivo, headcount, sst, nomina, seleccion, rotacion, fotos, ausentismo, capacitacion, clima, facturacion, activeModules: allowedModulos, cliNomOverride: cli?.nom, cliMarcaOverride: cli?.marca });
      downloadPPTX(blob, fileName);
      toast('PowerPoint 18 slides descargado ✓');
    } catch (e) { toast('Error PPTX: ' + e.message); console.error(e); }
    setGenerating(false);
  };

  const handleSave = (marcarCompletado=false) => {
    // Guardar contribución por área si es worker (solo sus módulos)
    try {
      if (esWorker && cliId && periodo) {
        const area = DB.areas.find(a=>a.id===user.areaId);
        if (area) {
          const datos = {};
          (area.modulos||[]).forEach(mid=>{
            if (mid==='seleccion') datos.seleccion = seleccion;
            if (mid==='sst') datos.sst = sst;
            if (mid==='ausentismo') datos.ausentismo = ausentismo;
            if (mid==='headcount') datos.headcount = headcount;
            if (mid==='rotacion') datos.rotacion = rotacion;
            if (mid==='nomina') datos.nomina = nomina;
            if (mid==='facturacion') datos.facturacion = facturacion;
            if (mid==='clima') datos.clima = clima;
            if (mid==='capacitacion') datos.capacitacion = capacitacion;
            if (mid==='fotos') datos.fotos = fotos;
          });
          const estado = marcarCompletado ? ESTADOS.COMPLETADO : ESTADOS.EN_PROCESO;
          saveContribucion({ cliId, per: periodo, areaId: area.id, userId: user.id, estado, datos });
          if (marcarCompletado) {
            toast('¡Completado Señor! Ya no aparecerá en tu lista — el Ejecutivo lo validará ✓');
          } else {
            toast('Tu parte guardada para ' + area.nombre + ' Señor ✓');
          }
        }
      }
    } catch {}
    if (canEditAll) {
      if (!previewHtml) {
        const html = buildInformePreviewHtml({ cliId, periodo, ejecutivo, headcount, sst, nomina, obs, seleccion, rotacion, fotos, logo, ausentismo, capacitacion, clima, facturacion, activeModules: allowedModulos });
        saveInforme({ cliId, periodo, ejId, ejecutivo, previewHtml: html, headcount, seleccion, rotacion, sst, nomina, fotos, ausentismo, capacitacion, clima, facturacion, activeModules: allowedModulos });
        setPreviewHtml(html);
      } else {
        saveInforme({ cliId, periodo, ejId, ejecutivo, previewHtml, headcount, seleccion, rotacion, sst, nomina, fotos, ausentismo, capacitacion, clima, facturacion, activeModules: allowedModulos });
      }
      if (!esWorker) toast('Informe completo guardado Señor ✓');
    } else if (!marcarCompletado) {
      // Worker que solo guarda borrador, no crea informe final
      // No hace saveInforme
    }
  };

  const canNext = () => {
    if (step === 0) return cliId && periodo;
    if (mode === 'auto' && steps[step]?.id === 'drive') return parsedFiles.length > 0 || localFiles.length > 0;
    return true;
  };

  const addRQ = () => setSeleccion([...seleccion, emptyRQ()]);
  const removeRQ = (i) => setSeleccion(seleccion.filter((_, idx) => idx !== i));
  const updateRQ = (i, f, v) => { const c = [...seleccion]; c[i] = { ...c[i], [f]: v }; setSeleccion(c); };

  const addMotivo = () => setRotacion([...rotacion, emptyMotivo()]);
  const removeMotivo = (i) => setRotacion(rotacion.filter((_, idx) => idx !== i));
  const updateMotivo = (i, f, v) => { const c = [...rotacion]; c[i] = { ...c[i], [f]: v }; setRotacion(c); };

  const addCaso = () => setSst({ ...sst, casos: [...(sst.casos || []), emptyCaso()] });
  const removeCaso = (i) => setSst({ ...sst, casos: (sst.casos || []).filter((_, idx) => idx !== i) });
  const updateCaso = (i, f, v) => { const c = [...(sst.casos || [])]; c[i] = { ...c[i], [f]: v }; setSst({ ...sst, casos: c }); };

  const addCapTema = () => setCapacitacion({ ...capacitacion, temas: [...(capacitacion.temas || []), { tema: '', asistentes: 0, horas: 0 }] });
  const removeCapTema = (i) => setCapacitacion({ ...capacitacion, temas: (capacitacion.temas || []).filter((_, idx) => idx !== i) });
  const updateCapTema = (i, f, v) => { const c = [...(capacitacion.temas || [])]; c[i] = { ...c[i], [f]: v }; setCapacitacion({ ...capacitacion, temas: c }); };

  const handleFoto = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFotos(prev => ({ ...prev, [i]: ev.target.result }));
    reader.readAsDataURL(file);
  };
  const removeFoto = (i) => setFotos(prev => { const c = { ...prev }; delete c[i]; return c; });

  if (!mode) {
    return <ModeSelect onSelect={setMode} />;
  }

  const currentStep = steps[step];

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Nuevo informe — {mode === 'auto' ? 'Automático' : 'Manual'}</div>
        <button className="btn bgh bsm" onClick={() => { setMode(null); setStep(0); }}>← Cambiar modo</button>
      </div>
      <div className="ps">{currentStep?.desc || ''} {esWorker && <span style={{background:'#E8BB26', color:'#12212D', padding:'2px 6px', borderRadius:10, fontSize:10, fontWeight:800, marginLeft:6}}>Área: {DB.areas.find(a=>a.id===user.areaId)?.nombre} — solo tus módulos</span>}{canEditAll && <span style={{background:'#168A43', color:'#fff', padding:'2px 6px', borderRadius:10, fontSize:10, fontWeight:800, marginLeft:6}}>Ejecutivo — ves todo</span>}</div>
      <ActiveModulosBanner activeModulos={allowedModulos} />
      <StepIndicator steps={steps} step={step} onStepClick={(idx)=> {
        const target = steps[idx];
        // Bloqueo: si es worker y el paso es de un módulo no permitido, no deja saltar
        if (target) {
          const modulo = ({ headcount:'headcount', seleccion:'seleccion', rotacion:'rotacion', sst:'sst', nomina:'nomina', ausentismo:'ausentismo', capacitacion:'capacitacion', clima:'clima', facturacion:'facturacion', photos:'fotos' })[target.id];
          if (modulo && !allowedModulos.includes(modulo) && !canEditAll) {
            toast('No tienes permiso para ese paso — solo ' + (DB.areas.find(a=>a.id===user.areaId)?.nombre || 'tu área'));
            return;
          }
        }
        setStep(idx);
      }} />

      {step === 0 && (
        <StepCliente clientes={clientes} cliId={cliId} setCliId={setCliId} periodo={periodo} setPeriodo={setPeriodo} ejecutivo={ejecutivo} />
      )}

      {step === stepIdx.drive && mode === 'auto' && (
        <StepDriveUpload uploading={uploading} onDrop={handleDrop} onLocalUpload={handleLocalUpload} onDriveFiles={handleDriveFiles} dataReport={dataReport} />
      )}

      {step === stepIdx.parse && mode === 'auto' && (
        <StepRevisarDatos
          dataReport={dataReport} headcount={headcount} seleccion={seleccion} rotacion={rotacion} sst={sst} nomina={nomina}
          onBack={() => setStep(stepIdx.drive)} onContinue={() => setStep(stepIdx.edit)}
        />
      )}

      {step === stepIdx.headcount && mode === 'manual' && (
        <StepHeadcount headcount={headcount} setHeadcount={setHeadcount} />
      )}

      {step === stepIdx.seleccion && mode === 'manual' && (
        <StepSeleccion seleccion={seleccion} addRQ={addRQ} removeRQ={removeRQ} updateRQ={updateRQ} />
      )}

      {step === stepIdx.rotacion && mode === 'manual' && (
        <StepRotacion rotacion={rotacion} addMotivo={addMotivo} removeMotivo={removeMotivo} updateMotivo={updateMotivo} />
      )}

      {step === stepIdx.sst && mode === 'manual' && (
        <StepSST sst={sst} setSst={setSst} obs={obs} setObs={setObs} addCaso={addCaso} removeCaso={removeCaso} updateCaso={updateCaso} />
      )}

      {step === stepIdx.nomina && mode === 'manual' && (
        <StepNomina nomina={nomina} setNomina={setNomina} />
      )}

      {step === stepIdx.ausentismo && mode === 'manual' && (
        <StepAusentismo ausentismo={ausentismo} setAusentismo={setAusentismo} />
      )}

      {step === stepIdx.capacitacion && mode === 'manual' && (
        <StepCapacitacion capacitacion={capacitacion} setCapacitacion={setCapacitacion} addItem={addCapTema} removeItem={removeCapTema} updateItem={updateCapTema} />
      )}

      {step === stepIdx.clima && mode === 'manual' && (
        <StepClima clima={clima} setClima={setClima} />
      )}

      {step === stepIdx.facturacion && mode === 'manual' && (
        <StepFacturacion facturacion={facturacion} setFacturacion={setFacturacion} />
      )}

      {step === stepIdx.photos && (
        <StepFotos fotos={fotos} onFoto={handleFoto} onRemoveFoto={removeFoto} />
      )}

      {step === stepIdx.edit && mode === 'auto' && (
        <StepAjustarDatos headcount={headcount} setHeadcount={setHeadcount} seleccion={seleccion} removeRQ={removeRQ} updateRQ={updateRQ} rotacion={rotacion} updateMotivo={updateMotivo} />
      )}

      {step === stepIdx.preview && (
        <>
          {(() => {
            const cs = cliId && periodo ? getContribucionesForClientePeriodo(cliId, periodo) : [];
            if (!cs.length) return null;
            return (
              <div className="card" style={{background:'#E8F5EE', border:'1px solid #168A43'}}>
                <div className="ct">Aportes colaborativos detectados — {cs.length} áreas</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                  {cs.map(c=> {
                    const area = DB.areas.find(a=>a.id===c.areaId);
                    const col = c.estado==='validado'?'#168A43': c.estado==='completado'?'#E8BB26':'#DDE4DD';
                    return <span key={c.id} style={{background:'#fff', border:`1px solid ${col}`, padding:'4px 8px', borderRadius:20, fontSize:11}}><span style={{display:'inline-block', width:8, height:8, borderRadius:'50%', background:col, marginRight:4}}></span>{area?.nombre||c.areaId}: <strong>{c.estado}</strong></span>
                  })}
                </div>
                <div style={{fontSize:11, color:'var(--grt)', marginTop:6}}>El informe se genera fusionando automáticamente lo que subieron Selección y SST. Usted como Ejecutivo puede validar y generar el final.</div>
              </div>
            );
          })()}
          <StepPreview previewHtml={previewHtml} onGeneratePreview={generatePreview} />
        </>
      )}

      {step === stepIdx.export && (
        <StepExport previewHtml={previewHtml} generating={generating} onExportHTML={handleExportHTML} onExportPDF={handleExportPDF} onExportPPTX={handleExportPPTX} onSave={handleSave} />
      )}

      {/* Navigation */}
      <div className="brow" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        {step > 0 ? <button className="btn bgh" onClick={() => setStep(step - 1)}>← Anterior</button> : <div />}
        {step < steps.length - 1 ? (
          <button className="btn bvd" onClick={() => {
            if (step === previewStepIdx) generatePreview();
            setStep(step + 1);
          }} disabled={!canNext()}>Siguiente →</button>
        ) : (
          <button className="btn bvd" onClick={() => { 
            if (esWorker) { 
              handleSave(true); 
              toast('¡Listo Señor! Guardado y enviado al Ejecutivo ✓');
              setTimeout(()=> { navigate('/'); }, 900);
            } else { 
              handleSave(false); 
              toast('¡Listo Señor! Informe guardado en Guardados ✓');
              setTimeout(()=> { navigate('/'); }, 900);
            }
          }}>✓ Finalizar</button>
        )}
      </div>
    </div>
  );
}
