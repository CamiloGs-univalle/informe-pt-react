import { useState, useEffect, useRef, useCallback } from "react";
import {
  getClisForEj, getClis, getEj, getCli, saveInf, toast,
  MOTIVOS_PRE, FOTOLABELS, saveCliFolder, getCliFolder
} from "../store";
import { buildInformeHTML } from "../htmlGenerator";
import { parseExcelFile, mergeExcelData, extractHeadcount, extractSeleccion, extractRotacion, extractSST, extractNomina, generateDataReport } from "../multiExcelParser";
import { generatePDF, downloadHTML } from "../pdfGenerator";
import DriveExplorer from "./DriveExplorer";

const STEPS_AUTO = [
  { id: 'cli', icon: '👤', label: 'Cliente', desc: 'Selecciona el cliente y el período del informe' },
  { id: 'drive', icon: '📁', label: 'Archivos', desc: 'Conecta Drive o sube los Excel con la información' },
  { id: 'parse', icon: '🔍', label: 'Revisar', desc: 'Revisa los datos extraídos de los archivos' },
  { id: 'edit', icon: '✏️', label: 'Ajustar', desc: 'Modifica o completa los datos antes de generar' },
  { id: 'photos', icon: '📷', label: 'Fotos', desc: 'Sube fotos de las actividades del mes' },
  { id: 'preview', icon: '👁', label: 'Vista previa', desc: 'Visualiza cómo quedará el informe' },
  { id: 'export', icon: '📥', label: 'Exportar', desc: 'Descarga en HTML y PDF' },
];

const STEPS_MANUAL = [
  { id: 'cli', icon: '👤', label: 'Cliente', desc: 'Selecciona el cliente y el período' },
  { id: 'headcount', icon: '👥', label: 'Headcount', desc: 'Movimiento de personal del mes' },
  { id: 'seleccion', icon: '🎯', label: 'Selección', desc: 'Requerimientos y contrataciones' },
  { id: 'rotacion', icon: '↻', label: 'Rotación', desc: 'Motivos de retiro del personal' },
  { id: 'sst', icon: '🛡️', label: 'SST', desc: 'Seguridad y salud en el trabajo' },
  { id: 'nomina', icon: '💰', label: 'Nómina', desc: 'Liquidaciones y novedades' },
  { id: 'photos', icon: '📷', label: 'Fotos', desc: 'Registro fotográfico' },
  { id: 'preview', icon: '👁', label: 'Vista previa', desc: 'Visualiza el informe' },
  { id: 'export', icon: '📥', label: 'Exportar', desc: 'Descarga HTML y PDF' },
];

export default function NuevoInforme({ ejId }) {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [ejecutivo, setEjecutivo] = useState(null);
  const [clientes, setClientes] = useState([]);

  const [cliId, setCliId] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [logo, setLogo] = useState(null);

  const [headcount, setHeadcount] = useState({ inicio: 0, ingresos: 0, retiros: 0 });
  const [seleccion, setSeleccion] = useState([]);
  const [rotacion, setRotacion] = useState([]);
  const [sst, setSst] = useState({ indicadores: {}, casos: [] });
  const [nomina, setNomina] = useState({});
  const [fotos, setFotos] = useState({});
  const [obs, setObs] = useState('');

  const [parsedFiles, setParsedFiles] = useState([]);
  const [dataReport, setDataReport] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);

  const [previewHtml, setPreviewHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef(null);

  const steps = mode === 'auto' ? STEPS_AUTO : STEPS_MANUAL;

  useEffect(() => {
    if (!ejId) return;
    setClientes(getClisForEj(ejId));
    setEjecutivo(getEj(ejId));
  }, [ejId]);

  useEffect(() => {
    if (cliId && periodo) {
      const existing = getCliFolder(cliId);
      if (existing) toast('Ruta de carpeta recordada: ' + existing);
    }
  }, [cliId, periodo]);

  const processFiles = useCallback(async (files) => {
    setUploading(true);
    try {
      const parsed = await Promise.all(files.map(f => parseExcelFile(f)));
      setParsedFiles(parsed);
      const merged = mergeExcelData(parsed);
      const hc = extractHeadcount(merged.headcount);
      const sel = extractSeleccion(merged.seleccion);
      const rot = extractRotacion(merged.rotacion);
      const sstData = extractSST(merged.sst);
      const nom = extractNomina(merged.nomina);
      setHeadcount(hc);
      if (sel.length) setSeleccion(sel); else setSeleccion([{ rq: '', agencia: '', ciudad: '', cargo: '', solicitadas: 0, contratadas: 0, nota: '' }]);
      if (rot.length) setRotacion(rot); else setRotacion([{ motivo: '', cantidad: 0 }]);
      setSst(sstData);
      setNomina(nom);
      const report = generateDataReport(merged);
      setDataReport(report);
      toast(`${parsed.length} archivo(s) procesado(s)`);
    } catch(e) { toast('Error al procesar archivos: ' + e.message); }
    setUploading(false);
  }, []);

  const handleLocalUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
  };

  const handleDriveFiles = async (files) => {
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
    if (mode === 'auto') setStep(2);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files || e.dataTransfer.files).filter(f => f.name.match(/\.(xlsx|xls|csv)$/i));
    if (!files.length) { toast('Solo se aceptan archivos Excel'); return; }
    setLocalFiles(prev => [...prev, ...files]);
    await processFiles(files);
  };

  const generatePreview = () => {
    const cli = getCli(cliId);
    const hcCierre = headcount.inicio + headcount.ingresos - headcount.retiros;
    const html = buildInformeHTML({
      cliId, per: periodo, ejNom: ejecutivo?.nom || '',
      cliNom: cli?.nom || '', cliMarca: cli?.marca || '',
      logoCli: cli?.logo || logo,
      hcInicio: headcount.inicio, hcIng: headcount.ingresos, hcRet: headcount.retiros, hcCierre,
      at: sst.indicadores?.at || 0, oc: sst.indicadores?.oc || 0,
      mat: sst.indicadores?.maternidad || 0, eg: sst.indicadores?.eg || 0,
      arl: sst.indicadores?.arl || 0, ind: sst.indicadores?.inducciones || 0,
      sstObs: obs, sstCasos: sst.casos || [],
      nliq: nomina.liquidados || 0, ninc: nomina.incapacidades || 0,
      nlic: nomina.licencias || 0, nhed: nomina.heDiurnas || 0,
      nhen: nomina.heNocturnas || 0, nerr: nomina.errores || 0,
      nobs: nomina.observaciones || '', rotObs: obs
    }, seleccion, rotacion, sst.casos || [], fotos);
    setPreviewHtml(html);
  };

  const getFileName = (ext) => {
    const cli = getCli(cliId);
    const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const pts = periodo.split('-');
    return `Informe_${cli?.nom || 'Cliente'}_${M[+pts[1]-1]}_${pts[0]}.${ext}`;
  };

  const handleExportHTML = () => { downloadHTML(previewHtml, getFileName('html')); toast('HTML descargado'); };
  const handleExportPDF = async () => {
    setGenerating(true);
    try { await generatePDF(previewHtml, getFileName('pdf')); toast('PDF descargado'); }
    catch(e) { toast('Error al generar PDF'); }
    setGenerating(false);
  };

  const handleSave = () => {
    const cli = getCli(cliId);
    saveInf({ cliId, per: periodo, ejId, ejNom: ejecutivo?.nom || '', cliNom: cli?.nom || '', html: previewHtml,
      headcount, seleccion, rotacion, sst, nomina, fotos });
    toast('Informe guardado');
  };

  const canNext = () => {
    if (step === 0) return cliId && periodo;
    if (step === 1 && mode === 'auto') return parsedFiles.length > 0 || localFiles.length > 0;
    return true;
  };

  const addRQ = () => setSeleccion([...seleccion, { rq: '', agencia: '', ciudad: '', cargo: '', solicitadas: 0, contratadas: 0, nota: '' }]);
  const removeRQ = (i) => setSeleccion(seleccion.filter((_, idx) => idx !== i));
  const updateRQ = (i, f, v) => { const c = [...seleccion]; c[i] = { ...c[i], [f]: v }; setSeleccion(c); };

  const addMotivo = () => setRotacion([...rotacion, { motivo: '', cantidad: 0 }]);
  const removeMotivo = (i) => setRotacion(rotacion.filter((_, idx) => idx !== i));
  const updateMotivo = (i, f, v) => { const c = [...rotacion]; c[i] = { ...c[i], [f]: v }; setRotacion(c); };

  const addCaso = () => setSst({ ...sst, casos: [...(sst.casos || []), { nombre: '', identificacion: '', cie10: '', fechaInicio: '', origen: 'AT laboral', ciudad: '', estado: 'Abierto', seguimiento: '' }] });
  const removeCaso = (i) => setSst({ ...sst, casos: (sst.casos || []).filter((_, idx) => idx !== i) });
  const updateCaso = (i, f, v) => { const c = [...(sst.casos || [])]; c[i] = { ...c[i], [f]: v }; setSst({ ...sst, casos: c }); };

  const handleFoto = (i, e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFotos(prev => ({ ...prev, [i]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  if (!mode) {
    return (
      <div>
        <div className="ph">Nuevo informe mensual</div>
        <div className="ps">Elige cómo quieres generar el informe</div>
        <div className="modo-tabs">
          <div className="modo-tab" onClick={() => setMode('auto')}>
            <span className="mt-ico">🚀</span>
            <div className="mt-tit">Automático con Drive</div>
            <div className="mt-sub">Conecta tu Google Drive o sube los Excel. El sistema extrae los datos automáticamente y genera el informe.</div>
          </div>
          <div className="modo-tab" onClick={() => setMode('manual')}>
            <span className="mt-ico">✏️</span>
            <div className="mt-tit">Manual — Campo a campo</div>
            <div className="mt-sub">Llena cada sección del formulario tú mismo. Ideal si no tienes archivos Excel o quieres control total.</div>
          </div>
        </div>
        <div className="card">
          <div className="ct">💡 ¿Cuál elegir?</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.8 }}>
            <strong>Automático:</strong> Rápido y preciso. Subes los Excel de Headcount, Selección, Rotación, SST y Nómina, y el sistema llena todo solo.<br/>
            <strong>Manual:</strong> Control total. Llenas cada campo paso a paso, ideal para datos que no están en Excel.
          </div>
        </div>
      </div>
    );
  }

  const currentStep = steps[step];

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Nuevo informe — {mode === 'auto' ? 'Automático' : 'Manual'}</div>
        <button className="btn bgh bsm" onClick={() => { setMode(null); setStep(0); }}>← Cambiar modo</button>
      </div>
      <div className="ps">{currentStep?.desc || ''}</div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{
            flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 8, cursor: i <= step ? 'pointer' : 'default',
            background: i === step ? 'var(--vc)' : i < step ? 'var(--vc)' : 'transparent',
            border: i === step ? '2px solid var(--vd)' : '2px solid transparent', transition: 'all .2s',
            opacity: i > step ? 0.5 : 1
          }} onClick={() => i <= step && setStep(i)}>
            <div style={{ fontSize: 16 }}>{s.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: i === step ? 'var(--vd)' : i < step ? 'var(--vd)' : 'var(--grt)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ STEP 0: Client ═══ */}
      {step === 0 && (
        <div className="card">
          <div className="ct">👤 Selecciona el cliente y período</div>
          <div className="fg3">
            <div>
              <label className="flabel">Cliente *</label>
              <select className="finput" value={cliId} onChange={e => setCliId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.marca ? ' · ' + c.marca : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="flabel">Período *</label>
              <input className="finput" type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} />
            </div>
            <div>
              <label className="flabel">Ejecutivo</label>
              <input className="finput" value={ejecutivo?.nom || ''} readOnly style={{ background: 'var(--gr)' }} />
            </div>
          </div>
          {cliId && getCliFolder(cliId) && (
            <div className="alrt avd" style={{ marginTop: 12 }}>📁 Ruta recordada: <strong>{getCliFolder(cliId)}</strong></div>
          )}
        </div>
      )}

      {/* ═══ STEP 1: Drive / Upload (Auto mode) ═══ */}
      {step === 1 && mode === 'auto' && (
        <div>
          <div className="card">
            <div className="ct">📁 Sube o conecta tus archivos Excel</div>
            <div className="alrt aam" style={{ marginBottom: 12 }}>
              <strong>¿Qué archivos necesitas?</strong><br/>
              El sistema busca automáticamente hojas de: <strong>Headcount, Selección, Rotación, SST, Nómina</strong>. Puedes subir uno o varios Excel.
            </div>
            <div className="dropzone" onDragOver={e => e.preventDefault()} onDrop={handleDrop}
              onClick={() => document.getElementById('excel-main').click()}>
              {uploading ? (
                <div><span className="dz-ico">⏳</span><div className="dz-tit">Procesando...</div></div>
              ) : (
                <div>
                  <span className="dz-ico">📊</span>
                  <div className="dz-tit">Arrastra los Excel aquí o haz clic</div>
                  <div className="dz-sub">Acepa .xlsx, .xls, .csv — Puedes subir varios archivos a la vez</div>
                  <div className="dz-fmt"><span className="fmt-chip">Excel</span><span className="fmt-chip">CSV</span></div>
                </div>
              )}
            </div>
            <input id="excel-main" type="file" accept=".xlsx,.xls,.csv" multiple style={{ display: 'none' }} onChange={handleLocalUpload} />
          </div>

          <div className="card">
            <div className="ct">🔗 O conecta directo con Google Drive</div>
            <DriveExplorer onFilesSelected={handleDriveFiles} />
          </div>

          {dataReport && (
            <div className="card" style={{ background: dataReport.missing.length ? 'var(--amc)' : 'var(--vc)', border: dataReport.missing.length ? '1px solid #e8d78a' : '1px solid #C8E6D4' }}>
              <div className="ct">{dataReport.missing.length ? '⚠️ Datos parciales' : '✅ Todos los datos encontrados'}</div>
              {dataReport.available.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--vd)', marginBottom: 4 }}>Encontrados:</div>
                  {dataReport.available.map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--vdo)', padding: '2px 0' }}>✓ {a.section} — {a.fields.join(', ')}</div>
                  ))}
                </div>
              )}
              {dataReport.missing.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7A6010', marginBottom: 4 }}>Faltantes (se pueden llenar después):</div>
                  {dataReport.missing.map((m, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#7A6010', padding: '2px 0' }}>• {m}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 1 (Manual): Headcount ═══ */}
      {step === 1 && mode === 'manual' && (
        <div className="card">
          <div className="ct">👥 Headcount — Movimiento de personal</div>
          <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>Registra el movimiento de personal del período. El cierre se calcula automáticamente.</div>
          <div className="fg4">
            <div><label className="flabel">Activos inicio</label><input className="finput" type="number" value={headcount.inicio} onChange={e => setHeadcount({...headcount, inicio: +e.target.value})} /></div>
            <div><label className="flabel">Ingresos</label><input className="finput" type="number" value={headcount.ingresos} onChange={e => setHeadcount({...headcount, ingresos: +e.target.value})} /></div>
            <div><label className="flabel">Retiros</label><input className="finput" type="number" value={headcount.retiros} onChange={e => setHeadcount({...headcount, retiros: +e.target.value})} /></div>
            <div><label className="flabel">Activos cierre</label><input className="finput" type="number" value={headcount.inicio + headcount.ingresos - headcount.retiros} readOnly style={{ background: 'var(--vc)', fontWeight: 700, color: 'var(--vd)' }} /></div>
          </div>
        </div>
      )}

      {/* ═══ STEP 2 (Manual): Selección ═══ */}
      {step === 2 && mode === 'manual' && (
        <div className="card">
          <div className="ct">🎯 Selección y contratación</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--grt)' }}>Requerimientos del período</span>
            <button className="btn bvd bsm" onClick={addRQ}>+ Agregar RQ</button>
          </div>
          {seleccion.map((rq, i) => (
            <div key={i} className="item-box">
              <div className="item-hd"><span>RQ #{i + 1}</span><button className="btn bro bsm" onClick={() => removeRQ(i)}>✕</button></div>
              <div className="fg3">
                <div><label className="flabel">RQ PT</label><input className="finput" value={rq.rq} onChange={e => updateRQ(i, 'rq', e.target.value)} /></div>
                <div><label className="flabel">Agencia</label><input className="finput" value={rq.agencia} onChange={e => updateRQ(i, 'agencia', e.target.value)} /></div>
                <div><label className="flabel">Ciudad</label><input className="finput" value={rq.ciudad} onChange={e => updateRQ(i, 'ciudad', e.target.value)} /></div>
              </div>
              <div className="fg4" style={{ marginTop: 8 }}>
                <div><label className="flabel">Cargo</label><input className="finput" value={rq.cargo} onChange={e => updateRQ(i, 'cargo', e.target.value)} /></div>
                <div><label className="flabel">Solicitadas</label><input className="finput" type="number" value={rq.solicitadas} onChange={e => updateRQ(i, 'solicitadas', +e.target.value)} /></div>
                <div><label className="flabel">Contratadas</label><input className="finput" type="number" value={rq.contratadas} onChange={e => updateRQ(i, 'contratadas', +e.target.value)} /></div>
                <div><label className="flabel">Nota</label><input className="finput" value={rq.nota} onChange={e => updateRQ(i, 'nota', e.target.value)} /></div>
              </div>
            </div>
          ))}
          {seleccion.length > 0 && (
            <div className="rqsum" style={{ display: 'block' }}>
              Solicitadas: <strong>{seleccion.reduce((s, r) => s + (r.solicitadas || 0), 0)}</strong> ·
              Contratadas: <strong>{seleccion.reduce((s, r) => s + (r.contratadas || 0), 0)}</strong> ·
              Efectividad: <strong>{seleccion.reduce((s, r) => s + (r.solicitadas || 0), 0) > 0 ? Math.round(seleccion.reduce((s, r) => s + (r.contratadas || 0), 0) / seleccion.reduce((s, r) => s + (r.solicitadas || 0), 0) * 100) : 0}%</strong>
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 3 (Manual): Rotación ═══ */}
      {step === 3 && mode === 'manual' && (
        <div className="card">
          <div className="ct">↻ Rotación del personal</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--grt)' }}>Causales de retiro</span>
            <button className="btn bvd bsm" onClick={addMotivo}>+ Agregar motivo</button>
          </div>
          {rotacion.map((m, i) => (
            <div key={i} className="item-box">
              <div className="item-hd"><span>Motivo #{i + 1}</span><button className="btn bro bsm" onClick={() => removeMotivo(i)}>✕</button></div>
              <div className="fg2">
                <div>
                  <label className="flabel">Motivo</label>
                  <select className="finput" value={m.motivo} onChange={e => updateMotivo(i, 'motivo', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {MOTIVOS_PRE.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                  </select>
                </div>
                <div><label className="flabel">Cantidad</label><input className="finput" type="number" value={m.cantidad} onChange={e => updateMotivo(i, 'cantidad', +e.target.value)} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ STEP 4 (Manual): SST ═══ */}
      {step === 4 && mode === 'manual' && (
        <div className="card">
          <div className="ct">🛡️ SST — Seguridad y Salud en el Trabajo</div>
          <div className="fg4">
            <div><label className="flabel">Accidentes AT</label><input className="finput" type="number" value={sst.indicadores?.at || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, at: +e.target.value}})} /></div>
            <div><label className="flabel">OC común/tránsito</label><input className="finput" type="number" value={sst.indicadores?.oc || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, oc: +e.target.value}})} /></div>
            <div><label className="flabel">Lic. maternidad</label><input className="finput" type="number" value={sst.indicadores?.maternidad || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, maternidad: +e.target.value}})} /></div>
            <div><label className="flabel">Días E.G.</label><input className="finput" type="number" value={sst.indicadores?.eg || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, eg: +e.target.value}})} /></div>
          </div>
          <div className="fg2" style={{ marginTop: 10 }}>
            <div><label className="flabel">Cobertura ARL %</label><input className="finput" type="number" value={sst.indicadores?.arl || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, arl: +e.target.value}})} /></div>
            <div><label className="flabel">Inducciones SST</label><input className="finput" type="number" value={sst.indicadores?.inducciones || 0} onChange={e => setSst({...sst, indicadores: {...sst.indicadores, inducciones: +e.target.value}})} /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="flabel">Observaciones</label>
            <textarea className="finput" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observaciones generales..." />
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vd)' }}>Casos médicos</span>
              <button className="btn bvd bsm" onClick={addCaso}>+ Agregar caso</button>
            </div>
            {(sst.casos || []).map((caso, i) => (
              <div key={i} className="item-box">
                <div className="item-hd"><span>Caso #{i + 1}</span><button className="btn bro bsm" onClick={() => removeCaso(i)}>✕</button></div>
                <div className="fg3">
                  <div><label className="flabel">Nombre</label><input className="finput" value={caso.nombre} onChange={e => updateCaso(i, 'nombre', e.target.value)} /></div>
                  <div><label className="flabel">ID</label><input className="finput" value={caso.identificacion} onChange={e => updateCaso(i, 'identificacion', e.target.value)} /></div>
                  <div><label className="flabel">CIE-10</label><input className="finput" value={caso.cie10} onChange={e => updateCaso(i, 'cie10', e.target.value)} /></div>
                </div>
                <div className="fg3" style={{ marginTop: 8 }}>
                  <div><label className="flabel">Fecha</label><input className="finput" type="date" value={caso.fechaInicio} onChange={e => updateCaso(i, 'fechaInicio', e.target.value)} /></div>
                  <div><label className="flabel">Origen</label><select className="finput" value={caso.origen} onChange={e => updateCaso(i, 'origen', e.target.value)}><option>AT laboral</option><option>Enfermedad general</option><option>Lic. maternidad</option><option>Otro</option></select></div>
                  <div><label className="flabel">Estado</label><select className="finput" value={caso.estado} onChange={e => updateCaso(i, 'estado', e.target.value)}><option>Abierto</option><option>En tratamiento</option><option>Alta médica</option><option>Retorno laboral</option></select></div>
                </div>
                <div style={{ marginTop: 8 }}><label className="flabel">Seguimiento</label><textarea className="finput" value={caso.seguimiento} onChange={e => updateCaso(i, 'seguimiento', e.target.value)} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 5 (Manual): Nómina ═══ */}
      {step === 5 && mode === 'manual' && (
        <div className="card">
          <div className="ct">💰 Nómina</div>
          <div className="fg4">
            <div><label className="flabel">Liquidados</label><input className="finput" type="number" value={nomina.liquidados || 0} onChange={e => setNomina({...nomina, liquidados: +e.target.value})} /></div>
            <div><label className="flabel">Incapacidades</label><input className="finput" type="number" value={nomina.incapacidades || 0} onChange={e => setNomina({...nomina, incapacidades: +e.target.value})} /></div>
            <div><label className="flabel">Licencias</label><input className="finput" type="number" value={nomina.licencias || 0} onChange={e => setNomina({...nomina, licencias: +e.target.value})} /></div>
            <div><label className="flabel">HE diurnas</label><input className="finput" type="number" value={nomina.heDiurnas || 0} onChange={e => setNomina({...nomina, heDiurnas: +e.target.value})} /></div>
          </div>
          <div className="fg2" style={{ marginTop: 10 }}>
            <div><label className="flabel">HE nocturnas</label><input className="finput" type="number" value={nomina.heNocturnas || 0} onChange={e => setNomina({...nomina, heNocturnas: +e.target.value})} /></div>
            <div><label className="flabel">Errores</label><input className="finput" type="number" value={nomina.errores || 0} onChange={e => setNomina({...nomina, errores: +e.target.value})} /></div>
          </div>
          <div style={{ marginTop: 10 }}><label className="flabel">Observaciones</label><textarea className="finput" value={nomina.observaciones || ''} onChange={e => setNomina({...nomina, observaciones: e.target.value})} /></div>
        </div>
      )}

      {/* ═══ STEP: Photos (both modes) ═══ */}
      {((mode === 'auto' && step === 4) || (mode === 'manual' && step === 6)) && (
        <div className="card">
          <div className="ct">📷 Fotos de actividades</div>
          <div className="fgrid">
            {FOTOLABELS.map((label, i) => (
              <div key={i} className="fslot" onClick={() => document.getElementById('foto-' + i).click()}>
                {fotos[i] ? (
                  <><img src={fotos[i]} alt={label} /><div className="fcap">{label}</div>
                  <button className="fdelbtn" onClick={e => { e.stopPropagation(); setFotos(prev => { const c = {...prev}; delete c[i]; return c; }); }}>✕</button></>
                ) : (<><div style={{ fontSize: 20, color: 'var(--grb)' }}>+</div><div style={{ fontSize: 10, color: 'var(--grt)' }}>{label}</div></>)}
                <input id={'foto-' + i} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFoto(i, e)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP: Review (Auto mode - editable) ═══ */}
      {step === 3 && mode === 'auto' && (
        <div>
          <div className="card">
            <div className="ct">✏️ Ajusta los datos extraídos</div>
            <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>Puedes modificar cualquier campo antes de generar el informe.</div>
          </div>
          <div className="card">
            <div className="ct">👥 Headcount</div>
            <div className="fg4">
              <div><label className="flabel">Inicio</label><input className="finput" type="number" value={headcount.inicio} onChange={e => setHeadcount({...headcount, inicio: +e.target.value})} /></div>
              <div><label className="flabel">Ingresos</label><input className="finput" type="number" value={headcount.ingresos} onChange={e => setHeadcount({...headcount, ingresos: +e.target.value})} /></div>
              <div><label className="flabel">Retiros</label><input className="finput" type="number" value={headcount.retiros} onChange={e => setHeadcount({...headcount, retiros: +e.target.value})} /></div>
              <div><label className="flabel">Cierre</label><input className="finput" type="number" value={headcount.inicio + headcount.ingresos - headcount.retiros} readOnly style={{ background: 'var(--vc)', fontWeight: 700, color: 'var(--vd)' }} /></div>
            </div>
          </div>
          <div className="card">
            <div className="ct">🎯 Selección ({seleccion.length} RQs)</div>
            {seleccion.map((rq, i) => (
              <div key={i} className="item-box">
                <div className="item-hd"><span>{rq.rq || 'RQ #' + (i+1)}</span><button className="btn bro bsm" onClick={() => removeRQ(i)}>✕</button></div>
                <div className="fg4">
                  <div><label className="flabel">Cargo</label><input className="finput" value={rq.cargo} onChange={e => updateRQ(i, 'cargo', e.target.value)} /></div>
                  <div><label className="flabel">Solicit.</label><input className="finput" type="number" value={rq.solicitadas} onChange={e => updateRQ(i, 'solicitadas', +e.target.value)} /></div>
                  <div><label className="flabel">Contrat.</label><input className="finput" type="number" value={rq.contratadas} onChange={e => updateRQ(i, 'contratadas', +e.target.value)} /></div>
                  <div><label className="flabel">Nota</label><input className="finput" value={rq.nota} onChange={e => updateRQ(i, 'nota', e.target.value)} /></div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="ct">↻ Rotación ({rotacion.length} motivos)</div>
            {rotacion.map((m, i) => (
              <div key={i} className="fg2" style={{ marginBottom: 8 }}>
                <select className="finput" value={m.motivo} onChange={e => updateMotivo(i, 'motivo', e.target.value)}>
                  <option value="">—</option>{MOTIVOS_PRE.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                </select>
                <input className="finput" type="number" value={m.cantidad} onChange={e => updateMotivo(i, 'cantidad', +e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP: Preview (both modes) ═══ */}
      {((mode === 'auto' && step === 5) || (mode === 'manual' && step === 7)) && (
        <div className="card">
          <div className="ct">👁 Vista previa del informe</div>
          <button className="btn bvd" onClick={generatePreview} style={{ marginBottom: 12 }}>🔄 Generar vista previa</button>
          {previewHtml ? (
            <div style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
              <iframe ref={previewRef} title="Vista previa" srcDoc={previewHtml} style={{ width: '100%', height: 600, border: 'none' }} />
            </div>
          ) : <div className="alrt aam">Haz clic en "Generar vista previa" para ver el informe.</div>}
        </div>
      )}

      {/* ═══ STEP: Export (both modes) ═══ */}
      {((mode === 'auto' && step === 6) || (mode === 'manual' && step === 8)) && (
        <div>
          <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
            <div className="ct">📥 Exportar informe</div>
            <div className="brow" style={{ marginTop: 0 }}>
              <button className="btn bvd" onClick={handleExportHTML} disabled={!previewHtml}>📄 Descargar HTML</button>
              <button className="btn bam" onClick={handleExportPDF} disabled={!previewHtml || generating}>📑 Descargar PDF</button>
              <button className="btn bgh" onClick={handleSave} disabled={!previewHtml}>💾 Guardar en historial</button>
            </div>
          </div>
          {previewHtml && (
            <div className="card">
              <div className="ct">👁 Vista previa final</div>
              <div style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
                <iframe title="Vista previa" srcDoc={previewHtml} style={{ width: '100%', height: 500, border: 'none' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="brow" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        {step > 0 ? <button className="btn bgh" onClick={() => setStep(step - 1)}>← Anterior</button> : <div />}
        {step < steps.length - 1 ? (
          <button className="btn bvd" onClick={() => {
            if (step === (mode === 'auto' ? 5 : 7)) generatePreview();
            setStep(step + 1);
          }} disabled={!canNext()}>Siguiente →</button>
        ) : (
          <button className="btn bvd" onClick={() => { handleSave(); toast('¡Informe completado!'); }}>✓ Finalizar</button>
        )}
      </div>
    </div>
  );
}