import { useState, useEffect, useRef } from "react";
import {
  getClisForEj, getClis, getEj, getCli, saveInf, toast,
  MOTIVOS_PRE, FOTOLABELS, saveCliFolder, getCliFolder
} from "../store";
import { buildInformeHTML } from "../htmlGenerator";
import { parseExcel, extractHeadcount, extractSeleccion, extractRotacion, extractSST, extractNomina, generateMissingReport } from "../excelParser";
import { generatePDF, downloadHTML } from "../pdfGenerator";

const STEPS = [
  { id: 'cli', icon: '👤', label: 'Cliente y período' },
  { id: 'data', icon: '📊', label: 'Datos del informe' },
  { id: 'review', icon: '🔍', label: 'Revisar datos' },
  { id: 'photos', icon: '📷', label: 'Fotos' },
  { id: 'preview', icon: '👁', label: 'Previsualizar' },
  { id: 'export', icon: '📥', label: 'Exportar' },
];

export default function NuevoInforme({ ejId }) {
  const [step, setStep] = useState(0);
  const [ejecutivo, setEjecutivo] = useState(null);
  const [clientes, setClientes] = useState([]);

  // Step 1: Client + Period
  const [cliId, setCliId] = useState('');
  const [periodo, setPeriodo] = useState('');

  // Step 2: Data from Excel
  const [excelFile, setExcelFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Step 3: Extracted data (editable)
  const [headcount, setHeadcount] = useState({ inicio: 0, ingresos: 0, retiros: 0 });
  const [seleccion, setSeleccion] = useState([]);
  const [rotacion, setRotacion] = useState([]);
  const [sst, setSst] = useState({ indicadores: {}, casos: [] });
  const [nomina, setNomina] = useState({});
  const [observaciones, setObservaciones] = useState('');

  // Step 4: Photos
  const [fotos, setFotos] = useState({});

  // Step 5: Preview
  const [previewHtml, setPreviewHtml] = useState('');
  const previewRef = useRef(null);

  // Step 6: Export
  const [generating, setGenerating] = useState(false);

  // Missing data report
  const [missing, setMissing] = useState([]);

  useEffect(() => {
    if (!ejId) return;
    const clis = getClisForEj(ejId);
    setClientes(clis);
    setEjecutivo(getEj(ejId));
  }, [ejId]);

  useEffect(() => {
    if (parsed) {
      const hc = extractHeadcount(parsed);
      if (hc) setHeadcount(hc);
      const sel = extractSeleccion(parsed);
      if (sel.length) setSeleccion(sel);
      const rot = extractRotacion(parsed);
      if (rot.length) setRotacion(rot);
      const sstData = extractSST(parsed);
      if (sstData.indicadores) setSst(sstData);
      const nom = extractNomina(parsed);
      if (nom.liquidados) setNomina(nom);
      const miss = generateMissingReport(parsed);
      setMissing(miss);
    }
  }, [parsed]);

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setParsing(true);
    setParseError('');
    try {
      const data = await parseExcel(file);
      setParsed(data);
      setExcelFile(file);
      toast('Archivo cargado correctamente');
    } catch(err) {
      setParseError('Error al leer el archivo: ' + err.message);
      toast('Error al leer el archivo');
    }
    setParsing(false);
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast('Solo se aceptan archivos Excel (.xlsx, .xls, .csv)');
      return;
    }
    setParsing(true);
    try {
      const data = await parseExcel(file);
      setParsed(data);
      setExcelFile(file);
      toast('Archivo cargado correctamente');
    } catch(err) {
      setParseError('Error al leer el archivo');
    }
    setParsing(false);
  };

  const saveFolderPath = () => {
    if (cliId) {
      saveCliFolder(cliId, 'Proservis/Informes/' + periodo);
      toast('Ruta de carpeta guardada');
    }
  };

  const generatePreview = () => {
    const cli = getCli(cliId);
    const hcCierre = headcount.inicio + headcount.ingresos - headcount.retiros;
    const html = buildInformeHTML({
      cliId, per: periodo, ejNom: ejecutivo?.nom || '',
      cliNom: cli?.nom || '', cliMarca: cli?.marca || '',
      logoCli: cli?.logo || null,
      hcInicio: headcount.inicio, hcIng: headcount.ingresos, hcRet: headcount.retiros, hcCierre,
      at: sst.indicadores?.at || 0, oc: sst.indicadores?.oc || 0,
      mat: sst.indicadores?.maternidad || 0, eg: sst.indicadores?.eg || 0,
      arl: sst.indicadores?.arl || 0, ind: sst.indicadores?.inducciones || 0,
      sstObs: observaciones, sstCasos: sst.casos || [],
      nliq: nomina.liquidados || 0, ninc: nomina.incapacidades || 0,
      nlic: nomina.licencias || 0, nhed: nomina.heDiurnas || 0,
      nhen: nomina.heNocturnas || 0, nerr: nomina.errores || 0,
      nobs: nomina.observaciones || '', rotObs: observaciones
    }, seleccion, rotacion, sst.casos || [], fotos);
    setPreviewHtml(html);
  };

  const handleExportHTML = async () => {
    setGenerating(true);
    const cli = getCli(cliId);
    const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const pts = periodo.split('-');
    const mesStr = M[+pts[1] - 1] + ' ' + pts[0];
    const filename = `Informe_${cli?.nom || 'Cliente'}_${mesStr}.html`;
    downloadHTML(previewHtml, filename);
    toast('HTML descargado');
    setGenerating(false);
  };

  const handleExportPDF = async () => {
    setGenerating(true);
    const cli = getCli(cliId);
    const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const pts = periodo.split('-');
    const mesStr = M[+pts[1] - 1] + ' ' + pts[0];
    const filename = `Informe_${cli?.nom || 'Cliente'}_${mesStr}.pdf`;
    try {
      await generatePDF(previewHtml, filename);
      toast('PDF descargado');
    } catch(err) {
      toast('Error al generar PDF');
    }
    setGenerating(false);
  };

  const handleSave = () => {
    const cli = getCli(cliId);
    saveInf({
      cliId, per: periodo, ejId, ejNom: ejecutivo?.nom || '',
      cliNom: cli?.nom || '', html: previewHtml,
      headcount, seleccion, rotacion, sst, nomina, fotos
    });
    toast('Informe guardado en historial');
  };

  const canNext = () => {
    if (step === 0) return cliId && periodo;
    if (step === 1) return parsed || missing.length <= 2;
    if (step === 2) return headcount.inicio > 0 || seleccion.length > 0;
    return true;
  };

  const addRQ = () => setSeleccion([...seleccion, { rq: '', agencia: '', ciudad: '', cargo: '', solicitadas: 0, contratadas: 0, nota: '' }]);
  const removeRQ = (i) => setSeleccion(seleccion.filter((_, idx) => idx !== i));
  const updateRQ = (i, field, val) => {
    const copy = [...seleccion];
    copy[i] = { ...copy[i], [field]: val };
    setSeleccion(copy);
  };

  const addMotivo = () => setRotacion([...rotacion, { motivo: '', cantidad: 0 }]);
  const removeMotivo = (i) => setRotacion(rotacion.filter((_, idx) => idx !== i));
  const updateMotivo = (i, field, val) => {
    const copy = [...rotacion];
    copy[i] = { ...copy[i], [field]: val };
    setRotacion(copy);
  };

  const addCaso = () => setSst({ ...sst, casos: [...(sst.casos || []), { nombre: '', identificacion: '', cie10: '', fechaInicio: '', origen: 'AT laboral', ciudad: '', estado: 'Abierto', seguimiento: '' }] });
  const removeCaso = (i) => setSst({ ...sst, casos: (sst.casos || []).filter((_, idx) => idx !== i) });
  const updateCaso = (i, field, val) => {
    const copy = [...(sst.casos || [])];
    copy[i] = { ...copy[i], [field]: val };
    setSst({ ...sst, casos: copy });
  };

  const handleFotoUpload = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFotos(prev => ({ ...prev, [idx]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="ph">Nuevo informe mensual</div>
      <div className="ps">Sigue los pasos para generar el informe del cliente</div>

      {/* STEP INDICATOR */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
        {STEPS.map((s, i) => (
          <div key={s.id} style={{
            flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8,
            background: i === step ? 'var(--vc)' : i < step ? 'var(--vc)' : 'transparent',
            border: i === step ? '2px solid var(--vd)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all .15s'
          }} onClick={() => i <= step && setStep(i)}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: i === step ? 'var(--vd)' : i < step ? 'var(--vd)' : 'var(--grt)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* STEP 0: Client + Period */}
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
              <input className="finput" type="text" value={ejecutivo?.nom || ''} readOnly style={{ background: 'var(--gr)' }} />
            </div>
          </div>
          {cliId && getCliFolder(cliId) && (
            <div className="alrt avd" style={{ marginTop: 12 }}>
              📁 Ruta guardada: <strong>{getCliFolder(cliId)}</strong>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Upload Excel */}
      {step === 1 && (
        <div>
          <div className="card">
            <div className="ct">📊 Sube el archivo Excel con los datos del mes</div>
            <div className="alrt aam" style={{ marginBottom: 12 }}>
              <strong>¿Qué archivos necesitas?</strong><br />
              El archivo debe contener hojas con: <strong>Headcount</strong> (movimiento de personal), <strong>Selección</strong> (RQs), <strong>Rotación</strong> (retiros), <strong>SST</strong> (accidentes), <strong>Nómina</strong> (liquidados).
            </div>
            <div
              className="dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => document.getElementById('excel-input').click()}
              style={{ cursor: 'pointer' }}
            >
              {parsing ? (
                <div><span className="dz-ico">⏳</span><div className="dz-tit">Procesando archivo...</div></div>
              ) : (
                <div>
                  <span className="dz-ico">📊</span>
                  <div className="dz-tit">Arrastra el Excel aquí o haz clic</div>
                  <div className="dz-sub">Archivos .xlsx, .xls o .csv</div>
                  <div className="dz-fmt">
                    <span className="fmt-chip">Excel</span>
                    <span className="fmt-chip">CSV</span>
                  </div>
                </div>
              )}
            </div>
            <input id="excel-input" type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelUpload} />
            {excelFile && (
              <div className="arch-item" style={{ marginTop: 12 }}>
                <span className="arch-ico">📊</span>
                <div className="arch-info">
                  <div className="arch-nm">{excelFile.name}</div>
                  <div className="arch-sz">{(excelFile.size / 1024).toFixed(1)} KB</div>
                </div>
                <span className="arch-status" style={{ color: 'var(--vd)' }}>✓ Cargado</span>
              </div>
            )}
            {parseError && <div className="alrt aro" style={{ marginTop: 12 }}>{parseError}</div>}
          </div>

          {missing.length > 0 && (
            <div className="card" style={{ background: 'var(--amc)', border: '1px solid #e8d78a' }}>
              <div className="ct">⚠️ Datos faltantes</div>
              <p style={{ fontSize: 12, color: '#7A6010', marginBottom: 8 }}>No se encontraron estos datos en el archivo:</p>
              {missing.map((m, i) => <div key={i} style={{ fontSize: 12, color: '#7A6010', padding: '3px 0' }}>• {m}</div>)}
              <p style={{ fontSize: 11, color: 'var(--grt)', marginTop: 8 }}>Puedes continuar y llenar estos campos manualmente en el siguiente paso.</p>
            </div>
          )}

          {!parsed && (
            <div className="card">
              <div className="ct">✏️ O llena manualmente</div>
              <p style={{ fontSize: 12, color: 'var(--grt)' }}>Si no tienes Excel, puedes saltar este paso y llenar los datos en el siguiente.</p>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Review/Edit Data */}
      {step === 2 && (
        <div>
          {/* Headcount */}
          <div className="card">
            <div className="ct">📊 Headcount — Movimiento de personal</div>
            <div className="fg4">
              <div>
                <label className="flabel">Activos inicio</label>
                <input className="finput" type="number" value={headcount.inicio} onChange={e => setHeadcount({...headcount, inicio: +e.target.value})} />
              </div>
              <div>
                <label className="flabel">Ingresos</label>
                <input className="finput" type="number" value={headcount.ingresos} onChange={e => setHeadcount({...headcount, ingresos: +e.target.value})} />
              </div>
              <div>
                <label className="flabel">Retiros</label>
                <input className="finput" type="number" value={headcount.retiros} onChange={e => setHeadcount({...headcount, retiros: +e.target.value})} />
              </div>
              <div>
                <label className="flabel">Activos cierre</label>
                <input className="finput" type="number" value={headcount.inicio + headcount.ingresos - headcount.retiros} readOnly style={{ background: 'var(--vc)', fontWeight: 700, color: 'var(--vd)' }} />
              </div>
            </div>
          </div>

          {/* Selección */}
          <div className="card">
            <div className="ct">🎯 Selección y contratación</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--grt)' }}>Requerimientos del período</span>
              <button className="btn bvd bsm" onClick={addRQ}>+ Agregar RQ</button>
            </div>
            {seleccion.map((rq, i) => (
              <div key={i} className="item-box">
                <div className="item-hd">
                  <span>RQ #{i + 1}</span>
                  <button className="btn bro bsm" onClick={() => removeRQ(i)}>✕</button>
                </div>
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

          {/* Rotación */}
          <div className="card">
            <div className="ct">↻ Rotación del personal</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--grt)' }}>Causales de retiro</span>
              <button className="btn bvd bsm" onClick={addMotivo}>+ Agregar motivo</button>
            </div>
            {rotacion.map((m, i) => (
              <div key={i} className="item-box">
                <div className="item-hd">
                  <span>Motivo #{i + 1}</span>
                  <button className="btn bro bsm" onClick={() => removeMotivo(i)}>✕</button>
                </div>
                <div className="fg2">
                  <div>
                    <label className="flabel">Motivo</label>
                    <select className="finput" value={m.motivo} onChange={e => updateMotivo(i, 'motivo', e.target.value)}>
                      <option value="">— Seleccionar —</option>
                      {MOTIVOS_PRE.map(mp => <option key={mp} value={mp}>{mp}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Cantidad</label>
                    <input className="finput" type="number" value={m.cantidad} onChange={e => updateMotivo(i, 'cantidad', +e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SST */}
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
              <label className="flabel">Observaciones SST</label>
              <textarea className="finput" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Observaciones generales del período..." />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--vd)' }}>Casos médicos en seguimiento</span>
                <button className="btn bvd bsm" onClick={addCaso}>+ Agregar caso</button>
              </div>
              {(sst.casos || []).map((caso, i) => (
                <div key={i} className="item-box">
                  <div className="item-hd">
                    <span>Caso #{i + 1}</span>
                    <button className="btn bro bsm" onClick={() => removeCaso(i)}>✕</button>
                  </div>
                  <div className="fg3">
                    <div><label className="flabel">Nombre</label><input className="finput" value={caso.nombre} onChange={e => updateCaso(i, 'nombre', e.target.value)} /></div>
                    <div><label className="flabel">Identificación</label><input className="finput" value={caso.identificacion} onChange={e => updateCaso(i, 'identificacion', e.target.value)} /></div>
                    <div><label className="flabel">CIE-10</label><input className="finput" value={caso.cie10} onChange={e => updateCaso(i, 'cie10', e.target.value)} /></div>
                  </div>
                  <div className="fg3" style={{ marginTop: 8 }}>
                    <div><label className="flabel">Fecha inicio</label><input className="finput" type="date" value={caso.fechaInicio} onChange={e => updateCaso(i, 'fechaInicio', e.target.value)} /></div>
                    <div>
                      <label className="flabel">Origen</label>
                      <select className="finput" value={caso.origen} onChange={e => updateCaso(i, 'origen', e.target.value)}>
                        <option>AT laboral</option><option>Enfermedad general</option><option> Lic. maternidad</option><option>Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="flabel">Estado</label>
                      <select className="finput" value={caso.estado} onChange={e => updateCaso(i, 'estado', e.target.value)}>
                        <option>Abierto</option><option>En tratamiento</option><option>Alta médica</option><option>Retorno laboral</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label className="flabel">Seguimiento</label>
                    <textarea className="finput" value={caso.seguimiento} onChange={e => updateCaso(i, 'seguimiento', e.target.value)} placeholder="Estado del caso..." />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nómina */}
          <div className="card">
            <div className="ct">💰 Nómina</div>
            <div className="fg4">
              <div><label className="flabel">Total liquidados</label><input className="finput" type="number" value={nomina.liquidados || 0} onChange={e => setNomina({...nomina, liquidados: +e.target.value})} /></div>
              <div><label className="flabel">Incapacidades</label><input className="finput" type="number" value={nomina.incapacidades || 0} onChange={e => setNomina({...nomina, incapacidades: +e.target.value})} /></div>
              <div><label className="flabel">Licencias</label><input className="finput" type="number" value={nomina.licencias || 0} onChange={e => setNomina({...nomina, licencias: +e.target.value})} /></div>
              <div><label className="flabel">HE diurnas</label><input className="finput" type="number" value={nomina.heDiurnas || 0} onChange={e => setNomina({...nomina, heDiurnas: +e.target.value})} /></div>
            </div>
            <div className="fg2" style={{ marginTop: 10 }}>
              <div><label className="flabel">HE nocturnas</label><input className="finput" type="number" value={nomina.heNocturnas || 0} onChange={e => setNomina({...nomina, heNocturnas: +e.target.value})} /></div>
              <div><label className="flabel">Errores nómina</label><input className="finput" type="number" value={nomina.errores || 0} onChange={e => setNomina({...nomina, errores: +e.target.value})} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="flabel">Observaciones nómina</label>
              <textarea className="finput" value={nomina.observaciones || ''} onChange={e => setNomina({...nomina, observaciones: e.target.value})} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Photos */}
      {step === 3 && (
        <div className="card">
          <div className="ct">📷 Fotos de actividades</div>
          <div className="alrt aam" style={{ marginBottom: 12 }}>Sube fotos de las actividades realizadas este mes. Son 9 slots disponibles.</div>
          <div className="fgrid">
            {FOTOLABELS.map((label, i) => (
              <div key={i} className="fslot" onClick={() => document.getElementById('foto-' + i).click()}>
                {fotos[i] ? (
                  <>
                    <img src={fotos[i]} alt={label} />
                    <div className="fcap">{label}</div>
                    <button className="fdelbtn" onClick={e => { e.stopPropagation(); setFotos(prev => { const c = {...prev}; delete c[i]; return c; }); }}>✕</button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 20, color: 'var(--grb)' }}>+</div>
                    <div style={{ fontSize: 10, color: 'var(--grt)' }}>{label}</div>
                  </>
                )}
                <input id={'foto-' + i} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFotoUpload(i, e)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Preview */}
      {step === 4 && (
        <div className="card">
          <div className="ct">👁 Previsualización del informe</div>
          <div className="brow" style={{ marginTop: 0, marginBottom: 12 }}>
            <button className="btn bvd" onClick={generatePreview}>🔄 Generar vista previa</button>
          </div>
          {previewHtml ? (
            <div className="prev-frame" style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
              <iframe ref={previewRef} title="Vista previa" srcDoc={previewHtml} style={{ width: '100%', height: 600, border: 'none' }} />
            </div>
          ) : (
            <div className="alrt aam">Haz clic en "Generar vista previa" para ver cómo quedará el informe.</div>
          )}
        </div>
      )}

      {/* STEP 5: Export */}
      {step === 5 && (
        <div>
          <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
            <div className="ct">📥 Exportar informe</div>
            <p style={{ fontSize: 12, color: 'var(--vdo)', marginBottom: 14 }}>
              El informe está listo. Elige el formato de descarga:
            </p>
            <div className="brow" style={{ marginTop: 0 }}>
              <button className="btn bvd" onClick={handleExportHTML} disabled={generating || !previewHtml}>
                📄 Descargar HTML
              </button>
              <button className="btn bam" onClick={handleExportPDF} disabled={generating || !previewHtml}>
                📑 Descargar PDF
              </button>
              <button className="btn bgh" onClick={handleSave} disabled={!previewHtml}>
                💾 Guardar en historial
              </button>
            </div>
            {generating && <p style={{ fontSize: 12, color: 'var(--grt)', marginTop: 10 }}>⏳ Generando archivo...</p>}
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

      {/* NAVIGATION */}
      <div className="brow" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        {step > 0 ? (
          <button className="btn bgh" onClick={() => setStep(step - 1)}>← Anterior</button>
        ) : <div />}
        {step < STEPS.length - 1 ? (
          <button className="btn bvd" onClick={() => {
            if (step === 1 && parsed) saveFolderPath();
            if (step === 4) generatePreview();
            setStep(step + 1);
          }} disabled={!canNext()}>
            Siguiente →
          </button>
        ) : (
          <button className="btn bvd" onClick={() => { handleSave(); toast('¡Informe completado!'); }}>
            ✓ Finalizar
          </button>
        )}
      </div>
    </div>
  );
}