/**
 * views/pages/MisContribuciones.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Worker (psicólogo, SST): sube su parte del informe de cada cliente.
 * Antes solo mostraba un <select> con lo pendiente del período. Ahora es
 * un panel de trabajo real: cuánto tiene pendiente, qué tan seguido su
 * trabajo pasa validación a la primera (su calidad), el feedback concreto
 * de su Ejecutivo cuando algo vuelve con correcciones, y su historial
 * completo — no solo el día de hoy.
 * SST sube el Excel ISSA tal cual y se toma automático; Selección sube ficha.
 */
import { useState, useEffect } from 'react';
import { getClisVisiblesParaUsuario, getClis } from '../../models/Cliente';
import { DB } from '../../models/db';
import { getContribucion, saveContribucion, completarContribucion, getContribucionesForUser, ESTADOS } from '../../models/Contribucion';
import { downloadPlantillaSeleccion, downloadPlantillaSST, downloadPlantillaHeadcount, downloadPlantillaAusentismo, downloadPlantillaCompleta } from '../../services/template.service';
import { parseMultipleExcels, mergeExcelData, extractSST } from '../../services/excel.service';
import SortTimePanel from '../common/SortTimePanel';
import { useToast } from '../common/useToast';
import { fmtPer, fmtPerLong } from '../../utils/format';
import InsightBanner from './dashboard/InsightBanner';
import { computeStats, computeWorkerInsight } from './contribuciones/stats';
import QualityCard from './contribuciones/QualityCard';
import RecomendacionesPanel from './contribuciones/RecomendacionesPanel';
import HistorialList from './contribuciones/HistorialList';
import PendingGrid from './contribuciones/PendingGrid';

export default function MisContribuciones({ user }) {
  const toast = useToast();
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0,7));
  const [clis, setClis] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ solicitadas:0, contratadas:0, oportunidad:0, tiempoRespuesta:0, at:0, oc:0 });
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('pendientes');
  const [search, setSearch] = useState('');
  const [, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  useEffect(() => { setClis(getClisVisiblesParaUsuario(user)); }, [user]);

  const areas = DB.areas.filter(a => (a.modulos||[]).length);
  const isSuperAdmin = user?.role === 'super_admin';
  // Un super_admin no tiene un área operativa fija — "Mis contribuciones" es la
  // pantalla de un colaborador de área (Selección, SST...), así que en vez de
  // heredar en silencio la primera área o lo que diga su registro de prueba,
  // puede elegir cuál área quiere previsualizar/trabajar.
  const [areaOverrideId, setAreaOverrideId] = useState(null);
  const myArea = isSuperAdmin
    ? (DB.areas.find(a => a.id === (areaOverrideId || user?.areaId)) || areas[0])
    : (DB.areas.find(a => a.id === user?.areaId) || areas[0]);
  const myModulos = myArea?.modulos || [];
  const esSST = myArea?.id === 'a2';

  // Nota: estos se recalculan en cada render (no useMemo) a propósito —
  // `tick` (desde refresh()) invalida datos leídos directo de DB, que es
  // mutable y no dispara re-render por sí sola; envolverlos en useMemo con
  // `tick` como dependencia solo para forzar el recálculo dejaría el valor
  // obsoleto justo después de guardar/completar una contribución.
  const clisFiltrados = clis.filter(c => {
    const ct = getContribucion(c.id, periodo, myArea?.id);
    if (!ct) return true;
    if (mostrarCompletados) return true;
    return ct.estado === ESTADOS.PENDIENTE || ct.estado === ESTADOS.EN_PROCESO || ct.estado === ESTADOS.RECHAZADO;
  });

  const pendingItems = clisFiltrados
    .filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()))
    .map(c => ({ cli: c, contrib: getContribucion(c.id, periodo, myArea?.id) }));

  // Historial completo del trabajador (todas las áreas x cliente x periodo
  // que ha tocado), con el nombre del cliente ya resuelto — es la base de
  // la pestaña "Mi historial" y de la métrica de calidad.
  const misContribsConNombre = user
    ? getContribucionesForUser(user.id)
        .map(c => ({ ...c, cliNom: getClis().find(x => x.id === c.cliId)?.nom || 'Cliente' }))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    : [];

  const stats = computeStats(misContribsConNombre, periodo);
  const insight = computeWorkerInsight(stats);

  const contrib = selected ? getContribucion(selected, periodo, myArea?.id) : null;
  const esEditable = !contrib || [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO, ESTADOS.RECHAZADO].includes(contrib.estado);
  const estaCompletado = contrib && [ESTADOS.COMPLETADO, ESTADOS.VALIDADO].includes(contrib.estado);

  useEffect(() => {
    if (!selected || !contrib) { setForm({ solicitadas:0, contratadas:0, oportunidad:0, tiempoRespuesta:0, at:0, oc:0 }); return; }
    const d = contrib.datos || {};
    if (myModulos.includes('seleccion') && d.seleccion && d.seleccion[0]) {
      const r = d.seleccion[0];
      setForm(f=> ({ ...f, solicitadas: r.solicitadas||0, contratadas: r.contratadas||0, oportunidad: r.oportunidad||0, tiempoRespuesta: r.tiempoRespuesta||r.diasCobertura||0 }));
    }
    if (myModulos.includes('sst') && d.sst) {
      setForm(f=> ({ ...f, at: d.sst.indicadores?.at||0, oc: d.sst.indicadores?.oc||0 }));
    }
  }, [selected, contrib, myModulos]);

  const handleSave = () => {
    if (!selected || !myArea) return;
    if (estaCompletado) { toast('Ya está completado — no se puede editar. Pida al Ejecutivo que lo rechace.'); return; }
    const datos = {};
    if (myModulos.includes('seleccion')) datos.seleccion = [{ rq:'RQ-PT-1', solicitadas: +form.solicitadas, contratadas: +form.contratadas, oportunidad: +form.oportunidad, tiempoRespuesta: +form.tiempoRespuesta, diasCobertura: +form.tiempoRespuesta, agencia:'', ciudad:'', cargo:'' }];
    if (myModulos.includes('sst')) {
      // Si ya subió ISSA, no sobreescribe con form manual
      if (!contrib?.datos?.sst_issa) datos.sst = { indicadores: { at:+form.at, oc:+form.oc, maternidad:0, eg:0, arl:100, inducciones:0 }, casos:[] };
      else datos.sst = contrib.datos.sst;
      if (contrib?.datos?.sst_issa) datos.sst_issa = contrib.datos.sst_issa;
      if (contrib?.datos?.sst_raw) datos.sst_raw = contrib.datos.sst_raw;
    }
    saveContribucion({ cliId: selected, per: periodo, areaId: myArea.id, userId: user.id, estado: ESTADOS.EN_PROCESO, datos });
    refresh();
    toast('Guardado como borrador — puedes seguir editando Señor ✓');
  };
  const handleCompletar = () => {
    if (!selected || !myArea) return;
    handleSave();
    setTimeout(()=> {
      completarContribucion(selected, periodo, myArea.id);
      refresh();
      toast('¡Marcado como completado! Ya no aparecerá en tu lista — el Ejecutivo lo validará Señor ✓');
      setSelected(null);
    }, 300);
  };

  const handleISSAUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) { toast('Seleccione cliente primero'); return; }
    if (!file.name.toLowerCase().includes('issa') && !file.name.toLowerCase().includes('incubadora')) {
      // igual intentar
    }
    setUploading(true);
    try {
      const parsed = await parseMultipleExcels([file]);
      const merged = mergeExcelData(parsed);
      // ISSA: usar db_issa + at_issa si existe
      let sstData;
      if (merged._is_issa && merged.db_issa) {
        sstData = extractSST([], {db_issa: merged.db_issa, at_issa: merged.at_issa, periodo});
        toast(`ISSA detectado — AT ${sstData.indicadores.at}, Tasa ${sstData.indicadores.tasaAccidentalidad}% — se tomó automático ✓`);
      } else {
        sstData = extractSST(merged.sst);
      }
      // Guardar como sst_issa para que el dashboard genere gráficas
      const datos = { sst: sstData, sst_issa: merged.db_issa, sst_raw: file.name, periodo };
      saveContribucion({ cliId: selected, per: periodo, areaId: myArea.id, userId: user.id, estado: ESTADOS.EN_PROCESO, datos });
      refresh();
      // Auto-completar si tiene datos
      if (sstData.indicadores.at !== undefined) {
        setForm(f=> ({...f, at: sstData.indicadores.at, oc: sstData.indicadores.oc||0}));
      }
      toast('ISSA subido y tomado automático — revise y marque completado Señor ✓');
    } catch (err) { toast('Error ISSA: ' + err.message); }
    setUploading(false);
    e.target.value='';
  };

  const handleDownloadPlantilla = () => {
    if (myModulos.includes('seleccion')) downloadPlantillaSeleccion();
    else if (myModulos.includes('sst')) downloadPlantillaSST();
    else if (myModulos.includes('headcount')) downloadPlantillaHeadcount();
    else if (myModulos.includes('ausentismo')) downloadPlantillaAusentismo();
    else downloadPlantillaCompleta();
  };

  const handleFix = (c) => {
    setTab('pendientes');
    setPeriodo(c.per);
    setSelected(c.cliId);
    toast('Te llevamos a corregir ' + c.cliNom + ' — lee el motivo arriba de la ficha');
  };

  return (
    <div>
      <div className="ph">Mis contribuciones</div>
      <div className="ps">Tu trabajo, tu avance y qué tan bien está saliendo — todo en un solo lugar. {esSST ? 'Sube el Excel ISSA tal cual — se toma automático y genera gráficas.' : 'Sube tu ficha.'} Al completar, el cliente pasa a manos de tu Ejecutivo.</div>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap'}}>
        <span className="b bin">{user?.nom}</span>
        {myArea && <span className="b bgr">📁 {myArea.nombre}</span>}
      </div>

      {isSuperAdmin && (
        <div className="alrt avd" style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          <span>👑 Como Super Admin no tienes un área operativa fija — elige cuál área quieres previsualizar o trabajar aquí.</span>
          <select className="finput" style={{maxWidth:230, marginLeft:'auto'}} value={myArea?.id || ''} onChange={e => setAreaOverrideId(e.target.value)}>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
      )}

      <InsightBanner insight={insight} />

      <div className="kgrid">
        <div className="kpi am"><div className="kl">Pendientes hoy</div><div className="kv" style={{color:'#9A7A10'}}>{stats.pendientesPeriodo}</div><div className="ks">{fmtPerLong(periodo)}</div></div>
        <div className="kpi"><div className="kl">Completadas este período</div><div className="kv">{stats.completadasPeriodo}</div><div className="ks">Enviadas al Ejecutivo</div></div>
        <div className="kpi"><div className="kl">Validadas en total</div><div className="kv">{stats.validadasHistorico}</div><div className="ks">Histórico</div></div>
        <div className="kpi" style={{borderLeftColor: stats.rechazadasActivas.length ? '#C0392B' : '#168A43'}}><div className="kl">Con corrección</div><div className="kv" style={{color: stats.rechazadasActivas.length ? 'var(--ro)' : 'var(--vd)'}}>{stats.rechazadasActivas.length}</div><div className="ks">Necesitan tu atención</div></div>
      </div>

      <QualityCard stats={stats} />

      <RecomendacionesPanel items={stats.rechazadasActivas.map(c => ({ ...c, cliNom: misContribsConNombre.find(x => x.id === c.id)?.cliNom || 'Cliente' }))} onFix={handleFix} />

      <div style={{display:'flex', gap:8, marginBottom:14}}>
        <button className={'btn bsm ' + (tab === 'pendientes' ? 'bvd' : 'bgh')} onClick={() => setTab('pendientes')}>📋 Pendientes</button>
        <button className={'btn bsm ' + (tab === 'historial' ? 'bvd' : 'bgh')} onClick={() => setTab('historial')}>🕘 Mi historial ({misContribsConNombre.length})</button>
      </div>

      {tab === 'historial' ? (
        <div className="card">
          <div className="ct">🕘 Historial completo de mis contribuciones</div>
          <HistorialList items={misContribsConNombre} />
        </div>
      ) : (
        <>
          <div className="card" style={{background:'#FBFDFB', border:'1px solid #E8EAE8'}}>
            <div className="ct">📥 Plantillas Excel — guía rápida</div>
            <div style={{fontSize:11, color:'var(--grt)', marginBottom:8}}>{esSST ? 'Para SST: plantilla EXACTA ISSA 2026 que ya usan (cada hoja es un indicador).' : 'Descarga la plantilla exacta de tu área y súbela sin errores.'}</div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn bvd bsm" onClick={handleDownloadPlantilla}>⬇ Descargar plantilla de {myArea?.nombre || 'mi área'}</button>
              <button className="btn bgh bsm" onClick={downloadPlantillaCompleta}>⬇ Plantilla completa</button>
              {esSST && <span style={{fontSize:10, color:'#1A5276', background:'#E3F2FD', padding:'4px 8px', borderRadius:20}}>ISSA = cada hoja es un indicador → Dashboard automático</span>}
            </div>
          </div>

          <div className="card">
            <div className="ct">Mis pendientes — periodo {fmtPer(periodo)}</div>
            <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'end', marginBottom:14}}>
              <div><label className="flabel">Periodo</label><input className="finput" type="month" value={periodo} onChange={e => { setPeriodo(e.target.value); setSelected(null); }} /></div>
              <div style={{flex:1, minWidth:200}}><label className="flabel">Buscar cliente</label><input className="finput" type="text" placeholder="Buscar por nombre..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
              <label style={{display:'flex', alignItems:'center', gap:6, fontSize:11, paddingBottom:9}}><input type="checkbox" checked={mostrarCompletados} onChange={e=>setMostrarCompletados(e.target.checked)} /> Mostrar completados</label>
              <span className="b bok" style={{fontSize:10}}>{clisFiltrados.length} de {clis.length}</span>
            </div>
            <PendingGrid items={pendingItems} selected={selected} onSelect={setSelected} />
          </div>

          {!selected ? <div className="alrt aam">Selecciona un cliente arriba para empezar a trabajar en su ficha.</div> : (
            <div className="card" style={{borderLeft: estaCompletado? '4px solid #168A43':'4px solid #E8BB26'}}>
              <div className="ct">Contribución: {myArea?.nombre} — {myArea?.modulos?.join(', ')} {estaCompletado && <span className="b bok" style={{marginLeft:8}}>Completado — solo lectura</span>}</div>
              {contrib && <div style={{fontSize:11, color:'var(--grt)', marginBottom:8}}>Estado: <span className="b" style={{background: estaCompletado?'#D4EDDA': contrib.estado==='rechazado'?'#FDF0EE':'#FDF6D8', color: estaCompletado?'#14501E': contrib.estado==='rechazado'?'#8B1A1A':'#7A6010'}}>{contrib.estado}</span> · Actualizado: {new Date(contrib.updatedAt).toLocaleString('es-CO')}</div>}
              {contrib?.estado === ESTADOS.RECHAZADO && contrib?.obs && (
                <div className="alrt aro" style={{marginBottom:12}}>↩️ <strong>Tu Ejecutivo pidió corregir:</strong> {contrib.obs}</div>
              )}
              {estaCompletado ? (
                <div className="alrt" style={{background:'#E8F5EE', border:'1px solid #168A43', padding:12, borderRadius:8, fontSize:12}}>
                  <strong>Ya completaste este cliente para {periodo}.</strong> No aparece más en tu lista. Si necesitas corregir, pide al Ejecutivo que lo rechace.
                </div>
              ) : (
                <>
                  {esSST ? (
                    <div>
                      <div style={{background:'#E3F2FD', border:'1px solid #1A5276', borderRadius:8, padding:12, marginBottom:12}}>
                        <div style={{fontWeight:800, color:'#0D47A1', fontSize:12}}>📊 SST — Sube el ISSA tal cual (cada hoja es un indicador)</div>
                        <div style={{fontSize:11, color:'var(--grt)', marginTop:4}}>El Excel que ya usan: <strong>DB_Indicadores, 1. Tas. Nacional, 2. Tas. Cauca...</strong> cada hoja genera su gráfica automático. No edite estructura.</div>
                        <div style={{marginTop:10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                          <label className="btn bvd bsm" style={{cursor:'pointer'}}>
                            {uploading ? '⏳ Procesando ISSA...' : '📁 Subir ISSA 2026.xlsx'}
                            <input type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={handleISSAUpload} disabled={uploading || !selected} />
                          </label>
                          <span style={{fontSize:11, color:'var(--grt)'}}>{contrib?.datos?.sst_raw ? `Ya subido: ${contrib.datos.sst_raw}` : 'Aún no subido'}</span>
                          {contrib?.datos?.sst?.indicadores?.at !== undefined && <span className="b bok">AT {contrib.datos.sst.indicadores.at} detectado ✓</span>}
                        </div>
                        <div style={{fontSize:10, color:'var(--grt)', marginTop:6}}>Se generan automáticamente: Tasa Nacional/Cauca/Santander, Severidad, Investigación, Ausentismo, etc. — ver Dashboard.</div>
                      </div>
                      <div className="fg3" style={{marginBottom:10}}>
                        <div><label className="flabel">AT (auto de ISSA)</label><input className="finput" type="number" value={form.at} onChange={e=>setForm({...form, at:e.target.value})} disabled={estaCompletado} /></div>
                        <div><label className="flabel">OC</label><input className="finput" type="number" value={form.oc} onChange={e=>setForm({...form, oc:e.target.value})} disabled={estaCompletado} /></div>
                        <div style={{fontSize:10, color:'var(--grt)', alignSelf:'center'}}>O edite manual si no usa ISSA</div>
                      </div>
                    </div>
                  ) : null}
                  {esSST && <SortTimePanel compact={true} />}
                  {myModulos.includes('seleccion') && (
                    <div>
                      <div style={{fontSize:11, fontWeight:700, color:'var(--vd)', marginBottom:6}}>Ficha técnica — 4 indicadores</div>
                      <div className="fg4" style={{marginBottom:10}}>
                        <div><label className="flabel">Solicitadas</label><input className="finput" type="number" value={form.solicitadas} onChange={e=>setForm({...form, solicitadas:e.target.value})} disabled={estaCompletado} /></div>
                        <div><label className="flabel">Contratadas</label><input className="finput" type="number" value={form.contratadas} onChange={e=>setForm({...form, contratadas:e.target.value})} disabled={estaCompletado} /></div>
                        <div><label className="flabel">Oportunidad %</label><input className="finput" type="number" value={form.oportunidad} onChange={e=>setForm({...form, oportunidad:e.target.value})} disabled={estaCompletado} /></div>
                        <div><label className="flabel">Tiempo resp. (días)</label><input className="finput" type="number" value={form.tiempoRespuesta} onChange={e=>setForm({...form, tiempoRespuesta:e.target.value})} disabled={estaCompletado} /></div>
                      </div>
                    </div>
                  )}
                  {!esSST && myModulos.includes('sst') && (
                    <div className="fg3" style={{marginBottom:12}}>
                      <div><label className="flabel">AT laborales</label><input className="finput" type="number" value={form.at} onChange={e=>setForm({...form, at:e.target.value})} disabled={estaCompletado} /></div>
                      <div><label className="flabel">OC / tránsito</label><input className="finput" type="number" value={form.oc} onChange={e=>setForm({...form, oc:e.target.value})} disabled={estaCompletado} /></div>
                      <div style={{fontSize:11, color:'var(--grt)', alignSelf:'center'}}>Se reporta a SST</div>
                    </div>
                  )}
                  {!myModulos.includes('seleccion') && !myModulos.includes('sst') && <div className="alrt aam">Su área no tiene módulos configurados — pida al Super Admin que asigne módulos.</div>}
                  <div className="brow" style={{marginTop:10}}>
                    <button className="btn bgh" onClick={handleSave} disabled={estaCompletado || !esEditable}>💾 Guardar borrador</button>
                    <button className="btn bvd" onClick={handleCompletar} disabled={estaCompletado || !esEditable}>✓ Marcar completado (ocultar y enviar a Ejecutivo)</button>
                  </div>
                  {esSST && contrib?.datos?.sst_issa && <div style={{fontSize:11, color:'#0D47A1', background:'#E3F2FD', padding:'6px 8px', borderRadius:6, marginTop:8}}>ISSA cargado — el Ejecutivo verá las gráficas automáticas en su Dashboard y PPTX. No olvide Marcar completado.</div>}
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="card">
        <div className="ct">Cómo funciona</div>
        <div style={{fontSize:12, lineHeight:1.6, color:'var(--grt)'}}>
          1. Ves solo pendientes de <strong>{myArea?.nombre}</strong> para el periodo elegido. {esSST && 'Sube el ISSA tal cual — cada hoja genera su gráfica.'} <br/>
          2. Guardas borrador para seguir editando. <br/>
          3. Al marcar completado, desaparece de pendientes y el Ejecutivo lo ve como <span className="b bok">completado</span> para validar. <br/>
          4. Si tu Ejecutivo pide una corrección, aparece arriba en <strong>Correcciones pedidas</strong> con el motivo — corrígelo y vuelve a completar. <br/>
          5. En <strong>Mi historial</strong> queda todo lo que has subido, y en <strong>Mi calidad de trabajo</strong> ves qué tan seguido pasa validación a la primera.
        </div>
      </div>
    </div>
  );
}
