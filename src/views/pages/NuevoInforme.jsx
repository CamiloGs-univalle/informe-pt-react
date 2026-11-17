/**
 * views/pages/NuevoInforme.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Asistente para armar el informe mensual de un cliente (ejecutivo líder).
 *   · Con archivos Excel: se extraen los datos y se revisan.
 *   · A mano: se llena cada módulo.
 * En ambos casos, al elegir cliente y mes se cargan automáticamente los
 * aportes que ya subieron las áreas (Selección, SST…), así el ejecutivo solo
 * revisa y completa. Guardar crea el informe en "Informes guardados" (si ya
 * existía uno de ese cliente y mes, pregunta si se reemplaza).
 *
 * Parámetros de URL: ?cliente=<id>&per=<AAAA-MM> (los usa "Mis clientes" y el Inicio).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DB } from '../../models/db';
import { getEj } from '../../models/Ejecutivo';
import { getCliFolder } from '../../models/Cliente';
import { deleteInf } from '../../models/Informe';
import { modulosActivosDe, modulosEfectivos } from '../../models/ModuloConfig';
import { clientesQueLidera } from '../../models/Alcance';
import { getContribucionesForClientePeriodo } from '../../models/Contribucion';
import { fusionarContribuciones } from '../../controllers/workflowController';
import { buildInformePreviewHtml, buildInformeFileName, saveInforme } from '../../controllers/informeController';
import { parseMultipleExcels, mergeExcelData, extractHeadcount, extractSeleccion, extractRotacion, extractSST, extractNomina, generateDataReport, extractAusentismo, extractCapacitacion, extractFacturacion, fusionarSST } from '../../services/excel.service';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import { generateInformePPTX, downloadPPTX } from '../../services/pptxReport.service';
import { periodoActual, fmtPerLong } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import { getAutoSteps, getManualSteps } from './nuevo-informe/steps';
import { useInformeData, emptyRQ, emptyMotivo } from './nuevo-informe/useInformeData';
import ModuleSection from './nuevo-informe/ModuleSection';
import ModeSelect from './nuevo-informe/ModeSelect';
import StepIndicator from './nuevo-informe/StepIndicator';
import ActiveModulosBanner from './nuevo-informe/ActiveModulosBanner';
import StepCliente from './nuevo-informe/StepCliente';
import StepDriveUpload from './nuevo-informe/StepDriveUpload';
import StepRevisarDatos from './nuevo-informe/StepRevisarDatos';
import StepAjustarDatos from './nuevo-informe/StepAjustarDatos';
import StepPreview from './nuevo-informe/StepPreview';
import StepExport from './nuevo-informe/StepExport';

export default function NuevoInforme({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [cliId, setCliId] = useState(() => { const p = params.get('cliente') || ''; return clientesQueLidera(user).some(c => c.id === p) ? p : ''; });
  const [periodo, setPeriodo] = useState(() => (/^\d{4}-\d{2}$/.test(params.get('per') || '') ? params.get('per') : periodoActual()));
  const data = useInformeData();
  const { d, cargar, reiniciar } = data;

  const [parsedFiles, setParsedFiles] = useState([]);
  const [dataReport, setDataReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const clientes = useMemo(() => clientesQueLidera(user), [user]);
  const cli = clientes.find(c => c.id === cliId) || null;
  const lider = (cli && getEj(cli.ejId)) || user;
  // Lo que decide el líder del cliente y lo que cada área reporta para ese cliente (Mis módulos).
  const allowedModulos = useMemo(() => (cli ? modulosEfectivos(cli) : modulosActivosDe(user.id, '')), [user.id, cli]);
  const aportes = cliId ? getContribucionesForClientePeriodo(cliId, periodo) : [];
  const informeExistente = DB.infs.find(i => i.cliId === cliId && i.per === periodo) || null;

  const steps = mode === 'auto' ? getAutoSteps(allowedModulos) : getManualSteps(allowedModulos);
  const idx = Object.fromEntries(steps.map((s, i) => [s.id, i]));
  const actual = steps[step];

  // Al cambiar cliente/mes: reiniciar y precargar los aportes de las áreas.
  useEffect(() => {
    reiniciar(); setPreviewHtml(''); setGuardado(false); setParsedFiles([]); setDataReport(null);
    if (!cliId) return;
    const cs = getContribucionesForClientePeriodo(cliId, periodo);
    if (cs.length) {
      const f = fusionarContribuciones(cliId, periodo);
      cargar({ headcount: f.headcount, seleccion: f.seleccion, rotacion: f.rotacion, sst: f.sst, nomina: f.nomina, ausentismo: f.ausentismo, capacitacion: f.capacitacion, clima: f.clima, facturacion: f.facturacion, fotos: f.fotos, obs: f.obs }, { reset: true });
    }
  }, [cliId, periodo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cliId && getCliFolder(cliId)) toast('Ruta de carpeta recordada: ' + getCliFolder(cliId), 'info');
  }, [cliId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildState = useCallback(() => ({ cliId, periodo, ejecutivo: lider, headcount: d.headcount, sst: d.sst, nomina: d.nomina, obs: d.obs, seleccion: d.seleccion, rotacion: d.rotacion, fotos: d.fotos, logo: null, ausentismo: d.ausentismo, capacitacion: d.capacitacion, clima: d.clima, facturacion: d.facturacion, activeModules: allowedModulos }), [cliId, periodo, lider, d, allowedModulos]);

  const generatePreview = useCallback(() => setPreviewHtml(buildInformePreviewHtml(buildState())), [buildState]);

  // La vista previa se arma sola al llegar a ese paso.
  useEffect(() => { if (actual?.id === 'preview') generatePreview(); }, [actual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const processFiles = async (files) => {
    setUploading(true);
    try {
      const parsed = await parseMultipleExcels(files);
      setParsedFiles(prev => [...prev, ...parsed]);
      const merged = mergeExcelData(parsed);
      const permitido = (m) => allowedModulos.includes(m);
      if (permitido('headcount')) data.setHeadcount(extractHeadcount(merged.headcount));
      if (permitido('seleccion')) { const s = extractSeleccion(merged.seleccion); data.setSeleccion(s.length ? s : [emptyRQ()]); }
      if (permitido('rotacion')) { const r = extractRotacion(merged.rotacion); data.setRotacion(r.length ? r : [emptyMotivo()]); }
      if (permitido('sst')) { const leido = merged._is_issa && merged.db_issa ? extractSST([], { db_issa: merged.db_issa, at_issa: merged.at_issa, periodo }) : extractSST(merged.sst); data.setSst(fusionarSST(d.sst, leido)); }
      if (permitido('nomina')) data.setNomina(extractNomina(merged.nomina));
      try {
        if (permitido('ausentismo') && merged.ausentismo) { const a = extractAusentismo(merged.ausentismo); if (a) data.setAusentismo(a); }
        if (permitido('capacitacion') && merged.capacitacion) { const temas = extractCapacitacion(merged.capacitacion); if (temas?.length) data.setCapacitacion(c => ({ ...c, temas })); }
        if (permitido('facturacion') && merged.facturacion) { const f = extractFacturacion(merged.facturacion); if (f) data.setFacturacion(f); }
      } catch (e) { console.warn('[Excel] extracción parcial:', e); }
      setDataReport(generateDataReport(merged));
      toast(`${parsed.length === 1 ? 'Archivo procesado' : parsed.length + ' archivos procesados'}. Revisa los datos en el siguiente paso.`, 'ok');
    } catch (e) { toast('No se pudieron leer los archivos: ' + (e.message || 'formato no válido'), 'error'); }
    setUploading(false);
  };

  const handleLocalUpload = async (e) => { const files = Array.from(e.target.files || []); e.target.value = ''; if (files.length) await processFiles(files); };
  const handleDriveFiles = async (files) => { await processFiles(files); if (mode === 'auto' && idx.parse != null) setStep(idx.parse); };
  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!files.length) { toast('Solo se aceptan archivos Excel o CSV.', 'error'); return; }
    await processFiles(files);
  };

  const nombre = (ext) => buildInformeFileName(cliId, periodo, ext);
  const conPreview = async (fn, okMsg) => {
    setGenerating(true);
    try { await fn(); toast(okMsg, 'ok'); } catch (e) { console.error(e); toast('No se pudo completar: ' + (e.message || 'error'), 'error'); }
    setGenerating(false);
  };
  const exportHTML = () => { downloadHTML(previewHtml, nombre('html')); toast('Descargaste el informe en HTML.', 'ok'); };
  const exportPDF = () => conPreview(() => generatePDF(previewHtml, nombre('pdf')), 'Descargaste el informe en PDF.');
  const exportPPTX = () => conPreview(async () => {
    const { blob, fileName } = await generateInformePPTX({ cliId, periodo, ejecutivo: lider, headcount: d.headcount, sst: d.sst, nomina: d.nomina, seleccion: d.seleccion, rotacion: d.rotacion, fotos: d.fotos, ausentismo: d.ausentismo, capacitacion: d.capacitacion, clima: d.clima, facturacion: d.facturacion, activeModules: allowedModulos, cliNomOverride: cli?.nom, cliMarcaOverride: cli?.marca });
    downloadPPTX(blob, fileName);
  }, 'Descargaste la presentación.');

  const guardar = async () => {
    const previo = DB.infs.find(i => i.cliId === cliId && i.per === periodo);
    if (previo) {
      const ok = await confirmar({ title: 'Ya existe un informe de este mes', message: `${cli.nom} ya tiene un informe guardado de ${fmtPerLong(periodo)}. ¿Quieres reemplazarlo con este?`, confirmLabel: 'Reemplazar' });
      if (!ok) return;
      deleteInf(previo.id);
    }
    const html = previewHtml || buildInformePreviewHtml(buildState());
    saveInforme({ cliId, periodo, ejId: lider.id, ejecutivo: lider, previewHtml: html, headcount: d.headcount, seleccion: d.seleccion, rotacion: d.rotacion, sst: d.sst, nomina: d.nomina, fotos: d.fotos, ausentismo: d.ausentismo, capacitacion: d.capacitacion, clima: d.clima, facturacion: d.facturacion, activeModules: allowedModulos });
    setPreviewHtml(html);
    setGuardado(true);
    toast('Informe guardado.', 'ok');
  };

  const puedeSeguir = () => {
    if (actual?.id === 'cli') return !!cliId && !!periodo;
    if (actual?.id === 'drive') return parsedFiles.length > 0;
    return true;
  };
  const motivoBloqueo = actual?.id === 'cli' ? 'Elige un cliente para continuar' : actual?.id === 'drive' ? 'Sube al menos un archivo para continuar' : '';

  if (!clientes.length) {
    return (
      <div>
        <PageHeader title="Nuevo informe" />
        <EmptyState icon="🧭" title="No tienes clientes para los que armar informes"
          action={user.role !== 'usuario' ? <button type="button" className="btn bvd" onClick={() => navigate('/aclientes')}>Asignar clientes</button> : null}>
          {user.role === 'usuario' ? 'Los informes los arma el ejecutivo líder de cada cliente. Pídele a tu administrador que te asigne como líder.' : 'Asigna un ejecutivo líder a los clientes para poder armar sus informes.'}
        </EmptyState>
      </div>
    );
  }

  if (!mode) {
    return (
      <div>
        <PageHeader title="Nuevo informe" subtitle="Elige cómo quieres armar el informe del mes. Podrás cambiar de modo, y lo que ya subieron las áreas se carga solo." />
        <ModeSelect onSelect={setMode} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Nuevo informe · ${mode === 'auto' ? 'con archivos' : 'a mano'}`} subtitle={actual?.desc}
        actions={<button type="button" className="btn bgh bsm" onClick={() => { setMode(null); setStep(0); }}>← Cambiar modo</button>} />
      <ActiveModulosBanner activeModulos={allowedModulos} />
      <StepIndicator steps={steps} step={step} onStepClick={setStep} />

      {actual?.id === 'cli' && (
        <StepCliente clientes={clientes} cliId={cliId} setCliId={setCliId} periodo={periodo} setPeriodo={setPeriodo} ejecutivo={lider}
          aportes={aportes} informeExistente={informeExistente} areaNombre={(id) => DB.areas.find(a => a.id === id)?.nombre || 'Área'} />
      )}

      {actual?.id === 'drive' && <StepDriveUpload uploading={uploading} onDrop={handleDrop} onLocalUpload={handleLocalUpload} onDriveFiles={handleDriveFiles} dataReport={dataReport} />}
      {actual?.id === 'parse' && (
        <StepRevisarDatos dataReport={dataReport} headcount={d.headcount} seleccion={d.seleccion} rotacion={d.rotacion} sst={d.sst} nomina={d.nomina}
          onBack={() => setStep(idx.drive)} onContinue={() => setStep(idx.edit)} />
      )}
      {actual?.id === 'edit' && (
        <StepAjustarDatos headcount={d.headcount} setHeadcount={data.setHeadcount} seleccion={d.seleccion} removeRQ={data.removeRQ} updateRQ={data.updateRQ} rotacion={d.rotacion} updateMotivo={data.updateMotivo} />
      )}
      {mode === 'manual' && actual && actual.id !== 'cli' && actual.id !== 'preview' && actual.id !== 'export' && (
        <ModuleSection id={actual.id === 'photos' ? 'fotos' : actual.id} data={data} modulos={allowedModulos} onFotoError={(m) => toast(m, 'error')} />
      )}
      {mode === 'auto' && actual?.id === 'photos' && <ModuleSection id="fotos" data={data} onFotoError={(m) => toast(m, 'error')} />}
      {actual?.id === 'preview' && <StepPreview previewHtml={previewHtml} onGeneratePreview={generatePreview} />}
      {actual?.id === 'export' && <StepExport previewHtml={previewHtml} generating={generating} guardado={guardado} onExportHTML={exportHTML} onExportPDF={exportPDF} onExportPPTX={exportPPTX} onSave={guardar} />}

      <div className="brow wiz-nav">
        {step > 0 ? <button type="button" className="btn bgh" onClick={() => setStep(step - 1)}>← Anterior</button> : <span />}
        {step < steps.length - 1 && (
          <>
            {!puedeSeguir() && <span className="text-muted">{motivoBloqueo}</span>}
            <button type="button" className="btn bvd" onClick={() => setStep(step + 1)} disabled={!puedeSeguir()}>Siguiente →</button>
          </>
        )}
      </div>
    </div>
  );
}
