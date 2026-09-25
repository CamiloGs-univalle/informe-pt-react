/**
 * views/pages/TableroColaborativo.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Vista para el EJECUTIVO líder: ve por periodo el avance por área de cada
 * cliente asignado, valida o rechaza contribuciones, y genera el informe
 * fusionado. Reescrita para: (1) agrupar por lo que de verdad necesita
 * acción — antes era una lista plana y había que escanear cliente por
 * cliente para saber qué te tocaba; (2) mostrar un pulso de actividad
 * reciente del equipo; (3) quitar la dependencia de `setTimeout` para
 * exportar PDF/PPTX (leía `preview`/`selected` de un closure viejo — con la
 * app real, con más de un clic rápido, podía exportar el cliente
 * equivocado o quedarse pegado); (4) pedir un motivo al rechazar, que antes
 * no existía.
 */
import { useState, useEffect } from 'react';
import { getClisForEj, getClis, getCli } from '../../models/Cliente';
import { getContribucionesForClientePeriodo, getResumenEstados, validarContribucion, ESTADOS } from '../../models/Contribucion';
import { fusionarContribuciones, getAreas } from '../../controllers/workflowController';
import { buildInformePreviewHtml, buildInformeFileName } from '../../controllers/informeController';
import { getEj, getUsersForAdmin } from '../../models/Ejecutivo';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import { generateInformePPTX, downloadPPTX } from '../../services/pptxReport.service';
import { useToast } from '../common/useToast';
import { Gauge } from './dashboard/charts';
import ActivityFeed from './tablero/ActivityFeed';
import ClientProgressCard from './tablero/ClientProgressCard';
import RejectModal from './tablero/RejectModal';

const GROUPS = [
  { key: 'awaiting', title: '🔔 Necesitan tu validación', hint: 'El área ya subió su parte — revisa y valida para avanzar.' },
  { key: 'rechazado', title: '↩️ Con correcciones pendientes', hint: 'Le pediste ajustes al área — están a la espera de que vuelvan a subir.' },
  { key: 'progreso', title: '🚧 En progreso', hint: 'Al menos una área ya está trabajando en esto.' },
  { key: 'listo', title: '✅ Listos y validados', hint: 'Todo validado — puedes generar el informe cuando quieras.' },
  { key: 'sinIniciar', title: '⭕ Sin iniciar', hint: 'Ninguna área ha subido nada todavía para este período.' },
];

const ACTIVITY_TEXT = {
  [ESTADOS.EN_PROCESO]: (areaNombre, cliNom) => <span><strong>{areaNombre}</strong> está trabajando en <strong>{cliNom}</strong></span>,
  [ESTADOS.COMPLETADO]: (areaNombre, cliNom) => <span><strong>{areaNombre}</strong> completó su parte de <strong>{cliNom}</strong></span>,
  [ESTADOS.VALIDADO]: (areaNombre, cliNom) => <span>Validaste la parte de <strong>{areaNombre}</strong> en <strong>{cliNom}</strong></span>,
  [ESTADOS.RECHAZADO]: (areaNombre, cliNom) => <span>Pediste correcciones a <strong>{areaNombre}</strong> en <strong>{cliNom}</strong></span>,
};

function computeClientRow(cli, areas, periodo) {
  const resumen = getResumenEstados(cli.id, periodo);
  const contribs = getContribucionesForClientePeriodo(cli.id, periodo);
  const pct = resumen.pct;
  const todoListo = pct === 100 || (contribs.length === areas.length && contribs.every(c => c.estado === ESTADOS.COMPLETADO || c.estado === ESTADOS.VALIDADO));
  const todoValidado = areas.length > 0 && contribs.length === areas.length && contribs.every(c => c.estado === ESTADOS.VALIDADO);
  const hasAwaiting = contribs.some(c => c.estado === ESTADOS.COMPLETADO);
  const hasRechazado = contribs.some(c => c.estado === ESTADOS.RECHAZADO);
  const hasProgress = contribs.some(c => c.estado !== ESTADOS.PENDIENTE);
  const lastUpdate = contribs.reduce((max, c) => (c.updatedAt > max ? c.updatedAt : max), '');

  const fused = fusionarContribuciones(cli.id, periodo);
  const sel = fused.seleccion || [];
  const totalSol = sel.reduce((a, r) => a + (r.solicitadas || 0), 0);
  const totalCon = sel.reduce((a, r) => a + (r.contratadas || 0), 0);
  const efectividad = totalSol ? Math.round(totalCon / totalSol * 100) : 0;
  const vacAct = totalSol - totalCon;
  const tiempoProm = sel.length ? Math.round(sel.reduce((a, r) => a + (Number(r.tiempoRespuesta || r.diasCobertura) || 0), 0) / sel.length) : 0;
  const oportunidad = sel.length ? Math.round(sel.reduce((a, r) => a + (Number(r.oportunidad) || efectividad), 0) / sel.length) : efectividad;

  let group;
  if (hasAwaiting) group = 'awaiting';
  else if (hasRechazado) group = 'rechazado';
  else if (todoValidado) group = 'listo';
  else if (hasProgress) group = 'progreso';
  else group = 'sinIniciar';

  return {
    cli, contribs, pct, todoListo, todoValidado, hasAwaiting, lastUpdate, group,
    ficha: { fichaSel: sel.length > 0, totalSol, totalCon, efectividad, vacAct, tiempoProm, oportunidad },
  };
}

/** Clientes visibles para este líder — mismo criterio que antes, solo movido fuera del componente. */
function resolveClis(user, ejId) {
  if (!user) return [];
  if (user.role === 'admin') {
    const team = getUsersForAdmin(user.id);
    const teamIds = new Set(team.map(t => t.id));
    const isEjecutivoAdmin = getAreas().filter(a => a.adminId === user.id).some(a => /ejecutivo|administraci|operaciones/i.test(a.nombre));
    if (isEjecutivoAdmin) return getClis().filter(c => c.workspaceId === user.workspaceId);
    return getClis().filter(c => teamIds.has(c.ejId) || c.ejId === user.id);
  }
  return ejId ? getClisForEj(ejId) : [];
}

export default function TableroColaborativo({ user, ejId }) {
  const toast = useToast();
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7));
  const [clis, setClis] = useState([]);
  const [preview, setPreview] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(null); // { cliId, tipo }
  const [rejectTarget, setRejectTarget] = useState(null); // { cliId, cliNom, areaId, areaNombre }
  const [, forceUpdate] = useState(0);

  useEffect(() => { setClis(resolveClis(user, ejId)); }, [user, ejId]);

  // Las contribuciones se mutan directamente en la DB (validar/rechazar);
  // esto solo fuerza un nuevo render para que `rows` (calculado abajo con
  // datos frescos de los getters) refleje el cambio de inmediato.
  const refresh = () => forceUpdate(n => n + 1);

  const areas = getAreas().filter(a => (a.modulos || []).length);
  // Vista de áreas para el chip del encabezado: deduplicada por nombre —
  // pueden existir dos registros de Área con el mismo nombre (creados por
  // separado en "Espacios y Áreas") y aquí solo es un rótulo informativo.
  const areasLegend = Array.from(new Map(areas.map(a => [a.nombre, a])).values());

  const rows = clis.map(cli => computeClientRow(cli, areas, periodo));
  const totalClientes = rows.length;
  const avgPct = totalClientes ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / totalClientes) : 0;
  const listos = rows.filter(r => r.group === 'listo').length;
  const necesitanValidacion = rows.filter(r => r.hasAwaiting).length;

  const activity = rows
    .flatMap(r => r.contribs
      .filter(c => c.estado !== ESTADOS.PENDIENTE)
      .map(c => {
        const area = areas.find(a => a.id === c.areaId);
        const text = ACTIVITY_TEXT[c.estado]?.(area?.nombre || 'Área', r.cli.nom) || `${area?.nombre || 'Área'} actualizó ${r.cli.nom}`;
        return { id: c.id, estado: c.estado, updatedAt: c.updatedAt, text };
      }))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 8);

  function buildFusedHtml(cliId) {
    const cli = getCli(cliId);
    const ej = getEj(ejId);
    const fused = fusionarContribuciones(cliId, periodo);
    return buildInformePreviewHtml({
      cliId, periodo, ejecutivo: ej, headcount: fused.headcount, sst: fused.sst, nomina: fused.nomina, obs: '',
      seleccion: fused.seleccion, rotacion: fused.rotacion, fotos: fused.fotos, logo: cli?.logo,
      ausentismo: fused.ausentismo, capacitacion: fused.capacitacion, clima: fused.clima, facturacion: fused.facturacion,
      activeModules: null,
    });
  }

  const handlePreview = (cliId) => {
    setBusy({ cliId, tipo: 'preview' });
    const html = buildFusedHtml(cliId);
    setPreview(html);
    setSelected(cliId);
    setBusy(null);
    requestAnimationFrame(() => document.getElementById('preview-fusion')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleExport = async (cliId, tipo) => {
    const cli = getCli(cliId);
    if (!cli) return;
    setBusy({ cliId, tipo });
    try {
      if (tipo === 'html') {
        downloadHTML(buildFusedHtml(cliId), buildInformeFileName(cliId, periodo, 'html'));
        toast('HTML descargado ✓');
      } else if (tipo === 'pdf') {
        await generatePDF(buildFusedHtml(cliId), buildInformeFileName(cliId, periodo, 'pdf'));
        toast('PDF fusionado descargado ✓');
      } else if (tipo === 'pptx') {
        const ej = getEj(ejId);
        const fused = fusionarContribuciones(cliId, periodo);
        const { blob, fileName } = await generateInformePPTX({
          cliId, periodo, ejecutivo: ej, headcount: fused.headcount, sst: fused.sst, nomina: fused.nomina,
          seleccion: fused.seleccion, rotacion: fused.rotacion, fotos: fused.fotos, ausentismo: fused.ausentismo,
          capacitacion: fused.capacitacion, clima: fused.clima, facturacion: fused.facturacion,
          cliNomOverride: cli.nom, cliMarcaOverride: cli.marca,
        });
        downloadPPTX(blob, fileName);
        toast('PPTX fusionado descargado ✓');
      }
    } catch (e) {
      toast('Error al exportar: ' + e.message);
    }
    setBusy(null);
  };

  const handleValidar = (cliId, areaId) => {
    validarContribucion(cliId, periodo, areaId, true);
    toast('Validado ✓');
    refresh();
  };
  const openReject = (cliId, cliNom, areaId, areaNombre) => setRejectTarget({ cliId, cliNom, areaId, areaNombre });
  const confirmReject = (reason) => {
    validarContribucion(rejectTarget.cliId, periodo, rejectTarget.areaId, false, reason);
    toast('Rechazado — se guardó el motivo para el área');
    setRejectTarget(null);
    refresh();
  };

  return (
    <div>
      <div className="ph">Tablero colaborativo <span style={{ fontSize: 11, color: 'var(--grt)', marginLeft: 8, fontWeight: 500 }}>{user?.nom} · {periodo}</span></div>
      <div className="ps">Ves qué área ya subió su parte de cada cliente y validas para habilitar el informe final. Todo el trabajo del equipo pasa por aquí, en simultáneo.</div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label className="flabel">Periodo</label><input className="finput" type="month" value={periodo} onChange={e => { setPeriodo(e.target.value); setSelected(null); setPreview(''); }} /></div>
          <div style={{ fontSize: 11, color: 'var(--grt)' }}>
            <span className="flabel" style={{ marginTop: 0 }}>Áreas colaborando</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {areasLegend.map(a => (
                <span key={a.id} style={{ display: 'inline-block', background: a.color, color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{a.nombre}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="kgrid">
        <div className="kpi" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Gauge pct={avgPct} />
          <div>
            <div className="kl">Avance promedio</div>
            <div className="kv" style={{ fontSize: 20 }}>{avgPct}%</div>
            <div className="ks">{totalClientes} cliente{totalClientes !== 1 ? 's' : ''} este período</div>
          </div>
        </div>
        <div className="kpi" style={{ borderLeftColor: necesitanValidacion > 0 ? '#E8BB26' : '#168A43' }}>
          <div className="kl">Necesitan tu validación</div>
          <div className="kv" style={{ color: necesitanValidacion > 0 ? '#9A7A10' : undefined }}>{necesitanValidacion}</div>
          <div className="ks">{necesitanValidacion > 0 ? 'Revísalas cuando puedas' : 'Nada pendiente por ahora'}</div>
        </div>
        <div className="kpi">
          <div className="kl">Listos y validados</div>
          <div className="kv">{listos}</div>
          <div className="ks">de {totalClientes} cliente{totalClientes !== 1 ? 's' : ''}</div>
        </div>
        <div className="kpi am">
          <div className="kl">Actividad reciente</div>
          <div className="kv" style={{ fontSize: 20 }}>{activity.length}</div>
          <div className="ks">actualizacion{activity.length !== 1 ? 'es' : ''} del equipo</div>
        </div>
      </div>

      <div className="card">
        <div className="ct">📡 Actividad reciente del equipo</div>
        <ActivityFeed items={activity} />
      </div>

      {!clis.length && <div className="alrt aam">No tiene clientes asignados — pida al Super Admin que le asigne clientes.</div>}

      {GROUPS.map(g => {
        const groupRows = rows.filter(r => r.group === g.key)
          .sort((a, b) => (g.key === 'listo' || g.key === 'sinIniciar') ? a.cli.nom.localeCompare(b.cli.nom) : (b.lastUpdate || '').localeCompare(a.lastUpdate || ''));
        if (!groupRows.length) return null;
        return (
          <div key={g.key} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{g.title}</div>
              <span className="b bgr">{groupRows.length}</span>
              <span style={{ fontSize: 11, color: 'var(--grt)' }}>{g.hint}</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {groupRows.map(r => (
                <ClientProgressCard
                  key={r.cli.id}
                  cli={r.cli} areas={areas} contribs={r.contribs} pct={r.pct} todoListo={r.todoListo} todoValidado={r.todoValidado}
                  ficha={r.ficha}
                  onValidar={(areaId) => handleValidar(r.cli.id, areaId)}
                  onRechazar={(areaId, areaNombre) => openReject(r.cli.id, r.cli.nom, areaId, areaNombre)}
                  onPreview={() => handlePreview(r.cli.id)}
                  onExport={(tipo) => handleExport(r.cli.id, tipo)}
                  exporting={busy && busy.cliId === r.cli.id ? busy.tipo : null}
                />
              ))}
            </div>
          </div>
        );
      })}

      {preview && (
        <div className="card" id="preview-fusion">
          <div className="ct">Vista previa fusionada — {getCli(selected)?.nom}</div>
          <div style={{ border: '2px solid var(--grb)', borderRadius: 10, overflow: 'hidden' }}>
            <iframe title="preview" srcDoc={preview} style={{ width: '100%', height: 600, border: 'none' }} />
          </div>
          <div className="brow">
            <button className="btn bgh" onClick={() => downloadHTML(preview, buildInformeFileName(selected, periodo, 'html'))}>📄 HTML</button>
            <button className="btn bam" onClick={() => handleExport(selected, 'pdf')}>📑 PDF</button>
            <button className="btn" style={{ background: '#E85D04', color: '#fff' }} onClick={() => handleExport(selected, 'pptx')}>📊 PPTX</button>
          </div>
        </div>
      )}

      <RejectModal target={rejectTarget} onCancel={() => setRejectTarget(null)} onConfirm={confirmReject} />
    </div>
  );
}
