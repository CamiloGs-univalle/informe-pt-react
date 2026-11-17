/**
 * views/pages/TableroColaborativo.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pantalla del EJECUTIVO LÍDER (y de admins / super admin): por período ve,
 * cliente por cliente, qué área ya subió su parte, valida o devuelve cada
 * aporte con un motivo, y cuando está listo arma el informe final
 * (vista previa, guardar en el historial, PDF / PowerPoint / HTML).
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DB } from '../../models/db';
import { getCli } from '../../models/Cliente';
import { getEj } from '../../models/Ejecutivo';
import { getContribucion, validarContribucion, ESTADOS } from '../../models/Contribucion';
import { deleteInf } from '../../models/Informe';
import { clientesQueLidera } from '../../models/Alcance';
import { areaAplica, moduloIncluido } from '../../models/ModuloConfig';
import { fusionarContribuciones } from '../../controllers/workflowController';
import { buildInformePreviewHtml, buildInformeFileName, saveInforme } from '../../controllers/informeController';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import { generateInformePPTX, downloadPPTX } from '../../services/pptxReport.service';
import { periodoActual, fmtPerLong, fmtNum, plural } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import PeriodPicker from '../common/PeriodPicker';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';
import { Gauge } from './dashboard/charts';
import ActivityFeed from './tablero/ActivityFeed';
import ClientProgressCard from './tablero/ClientProgressCard';
import RejectModal from './tablero/RejectModal';
import AporteModal from './tablero/AporteModal';

const GRUPOS = [
  { key: 'validar', title: 'Necesitan tu validación', hint: 'El área ya subió su parte: revísala y valídala o devuélvela.' },
  { key: 'corregir', title: 'Con correcciones pedidas', hint: 'Esperando que el área vuelva a enviar.' },
  { key: 'progreso', title: 'En progreso', hint: 'Al menos un área ya está trabajando.' },
  { key: 'listo', title: 'Listos para cerrar', hint: 'Todo validado: guarda el informe final.' },
  { key: 'sin', title: 'Sin iniciar', hint: 'Ninguna área ha subido nada en este período.' },
];

const TEXTO_ACTIVIDAD = {
  [ESTADOS.EN_PROCESO]: (a, c) => <span><strong>{a}</strong> está trabajando en <strong>{c}</strong></span>,
  [ESTADOS.COMPLETADO]: (a, c) => <span><strong>{a}</strong> envió su parte de <strong>{c}</strong></span>,
  [ESTADOS.VALIDADO]: (a, c) => <span>Se validó la parte de <strong>{a}</strong> en <strong>{c}</strong></span>,
  [ESTADOS.RECHAZADO]: (a, c) => <span>Se pidió corrección a <strong>{a}</strong> en <strong>{c}</strong></span>,
};

/** Áreas con módulos propios, sin repetir nombre (pueden existir duplicadas por workspace). */
function areasOperativas() {
  const vistas = new Set();
  return DB.areas.filter(a => (a.modulos || []).length).filter(a => (vistas.has(a.nombre) ? false : vistas.add(a.nombre)));
}

function filaDe(cli, areas, per) {
  // Una parte aplica si está asignada (o ya existe) Y el área tiene algo que reportar para este cliente (Mis módulos).
  const aplican = areas.filter(a => {
    const ct = getContribucion(cli.id, per, a.id);
    return (cli.asignaciones?.[a.id] || ct) && (areaAplica(cli, a) || (ct && ct.estado !== ESTADOS.PENDIENTE));
  });
  const filas = aplican.map(area => {
    const contrib = getContribucion(cli.id, per, area.id);
    const uid = contrib?.userId || cli.asignaciones?.[area.id];
    return { area, contrib, quien: uid ? getEj(uid)?.nom : '' };
  });
  const total = filas.length;
  const hechas = filas.filter(f => f.contrib && [ESTADOS.COMPLETADO, ESTADOS.VALIDADO].includes(f.contrib.estado)).length;
  const pct = total ? Math.round(hechas / total * 100) : 0;
  const estados = filas.map(f => f.contrib?.estado || ESTADOS.PENDIENTE);
  let grupo = 'sin';
  if (estados.includes(ESTADOS.COMPLETADO)) grupo = 'validar';
  else if (estados.includes(ESTADOS.RECHAZADO)) grupo = 'corregir';
  else if (total && estados.every(e => e === ESTADOS.VALIDADO)) grupo = 'listo';
  else if (estados.some(e => e !== ESTADOS.PENDIENTE)) grupo = 'progreso';

  const sel = fusionarContribuciones(cli.id, per).seleccion || [];
  const totalSol = sel.reduce((a, r) => a + (r.solicitadas || 0), 0);
  const totalCon = sel.reduce((a, r) => a + (r.contratadas || 0), 0);
  const efectividad = totalSol ? Math.round(totalCon / totalSol * 100) : 0;
  const ficha = sel.length ? {
    totalSol, totalCon, efectividad, vacAct: totalSol - totalCon,
    tiempoProm: Math.round(sel.reduce((a, r) => a + (Number(r.tiempoRespuesta || r.diasCobertura) || 0), 0) / sel.length),
    oportunidad: Math.round(sel.reduce((a, r) => a + (Number(r.oportunidad) || efectividad), 0) / sel.length),
  } : null;
  const ultimo = filas.reduce((m, f) => (f.contrib?.updatedAt > m ? f.contrib.updatedAt : m), '');
  const informe = DB.infs.find(i => i.cliId === cli.id && i.per === per);
  return { cli, filas, pct, grupo, ficha, ultimo, informe, listo: total > 0 && hechas === total };
}

export default function TableroColaborativo({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const perParam = params.get('per');
  const [periodo, setPeriodo] = useState(/^\d{4}-(0[1-9]|1[0-2])$/.test(perParam || '') ? perParam : periodoActual);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [ocupado, setOcupado] = useState(null); // { cliId, tipo }
  const [rechazo, setRechazo] = useState(null);
  const [aporte, setAporte] = useState(null);
  const [vista, setVista] = useState(null); // { cliId, html }
  const [filtro, setFiltro] = useState('');

  const clientes = clientesQueLidera(user); // barato; se recalcula en cada render para reflejar cambios de datos
  const filas = useMemo(() => {
    const areas = areasOperativas();
    return clientes.map(c => filaDe(c, areas, periodo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, periodo, version]);

  const visibles = filtro.trim() ? filas.filter(f => (f.cli.nom + ' ' + (f.cli.nit || '')).toLowerCase().includes(filtro.trim().toLowerCase())) : filas;
  const avance = filas.length ? Math.round(filas.reduce((s, f) => s + f.pct, 0) / filas.length) : 0;
  const porValidar = filas.reduce((s, f) => s + f.filas.filter(x => x.contrib?.estado === ESTADOS.COMPLETADO).length, 0);
  const listos = filas.filter(f => f.grupo === 'listo').length;

  const actividad = filas.flatMap(f => f.filas.filter(x => x.contrib && x.contrib.estado !== ESTADOS.PENDIENTE)
    .map(x => ({ id: x.contrib.id, estado: x.contrib.estado, updatedAt: x.contrib.updatedAt, text: TEXTO_ACTIVIDAD[x.contrib.estado]?.(x.area.nombre, f.cli.nom) })))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6);

  function datosInforme(cliId) {
    const cli = getCli(cliId);
    const lider = getEj(cli?.ejId) || user;
    const f = fusionarContribuciones(cliId, periodo);
    const activeModules = areasOperativas().filter(a => cli?.asignaciones?.[a.id] || getContribucion(cliId, periodo, a.id)).flatMap(a => a.modulos).filter(m => moduloIncluido(cli, m));
    return { cliId, periodo, ejId: lider.id, ejecutivo: lider, headcount: f.headcount, sst: f.sst, nomina: f.nomina, obs: f.obs || '', seleccion: f.seleccion, rotacion: f.rotacion, fotos: f.fotos, logo: cli?.logo, ausentismo: f.ausentismo, capacitacion: f.capacitacion, clima: f.clima, facturacion: f.facturacion, activeModules: [...new Set(activeModules)], fused: f };
  }

  async function validar(cli, area) {
    validarContribucion(cli.id, periodo, area.id, true);
    toast(`Validaste el aporte de ${area.nombre} en ${cli.nom}.`, 'ok');
    refresh();
  }
  function confirmarRechazo(motivo) {
    validarContribucion(rechazo.cliId, periodo, rechazo.areaId, false, motivo);
    toast(`Se devolvió el aporte a ${rechazo.areaNombre} con tu mensaje.`, 'ok');
    setRechazo(null);
    refresh();
  }

  async function accion(cliId, tipo) {
    const cli = getCli(cliId);
    setOcupado({ cliId, tipo });
    try {
      const d = datosInforme(cliId);
      if (tipo === 'preview') {
        setVista({ cliId, html: buildInformePreviewHtml(d) });
      } else if (tipo === 'guardar') {
        const previo = DB.infs.find(i => i.cliId === cliId && i.per === periodo);
        if (previo) {
          const ok = await confirmar({ title: 'Ya hay un informe de este período', message: `${cli.nom} ya tiene un informe guardado de ${fmtPerLong(periodo)}. ¿Reemplazarlo con esta versión?`, confirmLabel: 'Reemplazar' });
          if (!ok) { setOcupado(null); return; }
          deleteInf(previo.id);
        }
        saveInforme({ ...d, previewHtml: buildInformePreviewHtml(d) });
        toast('Informe guardado en “Informes guardados”.', 'ok');
        refresh();
      } else if (tipo === 'html') {
        downloadHTML(buildInformePreviewHtml(d), buildInformeFileName(cliId, periodo, 'html'));
        toast('Descargaste el informe en HTML.', 'ok');
      } else if (tipo === 'pdf') {
        await generatePDF(buildInformePreviewHtml(d), buildInformeFileName(cliId, periodo, 'pdf'));
        toast('Descargaste el informe en PDF.', 'ok');
      } else if (tipo === 'pptx') {
        const f = d.fused;
        const { blob, fileName } = await generateInformePPTX({ cliId, periodo, ejecutivo: d.ejecutivo, headcount: f.headcount, sst: f.sst, nomina: f.nomina, seleccion: f.seleccion, rotacion: f.rotacion, fotos: f.fotos, ausentismo: f.ausentismo, capacitacion: f.capacitacion, clima: f.clima, facturacion: f.facturacion, cliNomOverride: cli.nom, cliMarcaOverride: cli.marca });
        downloadPPTX(blob, fileName);
        toast('Descargaste la presentación.', 'ok');
      }
    } catch (e) {
      console.error(e);
      toast('No se pudo completar: ' + (e.message || 'error desconocido'), 'error');
    }
    setOcupado(null);
  }

  return (
    <div>
      <PageHeader
        title="Tablero del equipo"
        subtitle="Aquí ves qué área ya subió su parte de cada cliente, validas o devuelves con un motivo, y cierras el informe final."
        actions={<PeriodPicker value={periodo} onChange={setPeriodo} />}
      />

      {!clientes.length ? (
        <EmptyState icon="🧭" title="Todavía no lideras ningún cliente"
          action={user.role !== 'usuario' ? <button type="button" className="btn bvd" onClick={() => navigate('/aclientes')}>Asignar clientes</button> : null}>
          {user.role === 'usuario' ? 'Pídele a tu administrador que te asigne como ejecutivo líder de los clientes que vas a atender.' : 'Asigna un ejecutivo líder a cada cliente para que aparezcan aquí.'}
        </EmptyState>
      ) : (
        <>
          <div className="kgrid">
            <div className="kpi kpi-gauge">
              <Gauge pct={avance} />
              <div><div className="kl">Avance de {fmtPerLong(periodo)}</div><div className="kv kv-md">{avance}%</div><div className="ks">{plural(filas.length, 'cliente')} a tu cargo</div></div>
            </div>
            <div className={'kpi' + (porValidar ? ' am' : '')}><div className="kl">Por validar</div><div className="kv">{fmtNum(porValidar)}</div><div className="ks">{porValidar ? 'Aportes esperando tu revisión' : 'Nada pendiente por ahora'}</div></div>
            <div className="kpi"><div className="kl">Listos para cerrar</div><div className="kv">{fmtNum(listos)}</div><div className="ks">de {fmtNum(filas.length)} clientes</div></div>
            <div className="kpi am"><div className="kl">Actividad reciente</div><div className="kv">{fmtNum(actividad.length)}</div><div className="ks">{actividad.length === 1 ? 'movimiento' : 'movimientos'} del equipo</div></div>
          </div>

          <div className="card">
            <div className="ct">Actividad reciente</div>
            <ActivityFeed items={actividad} />
          </div>

          <div className="toolbar">
            <input className="finput grow" type="search" placeholder="Buscar cliente por nombre o NIT…" value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Buscar cliente" />
            {filtro && <button type="button" className="btn bgh bsm" onClick={() => setFiltro('')}>Limpiar</button>}
            <span className="count">{plural(visibles.length, 'cliente')}</span>
          </div>

          {!visibles.length && <EmptyState icon="🔎" title="Ningún cliente coincide">Prueba con otra parte del nombre o del NIT.</EmptyState>}

          {GRUPOS.map(g => {
            const lista = visibles.filter(f => f.grupo === g.key).sort((a, b) => (g.key === 'listo' || g.key === 'sin') ? a.cli.nom.localeCompare(b.cli.nom) : (b.ultimo || '').localeCompare(a.ultimo || ''));
            if (!lista.length) return null;
            return (
              <section key={g.key} className="tb-group">
                <div className="tb-group-h"><h2>{g.title}</h2><span className="chip">{lista.length}</span><span className="text-muted">{g.hint}</span></div>
                <div className="stack-14">
                  {lista.map(f => (
                    <ClientProgressCard key={f.cli.id} cli={f.cli} filas={f.filas} pct={f.pct} listo={f.listo} ficha={f.ficha}
                      ejecutivo={getEj(f.cli.ejId)?.nom} informeGuardado={!!f.informe}
                      onValidar={(area) => validar(f.cli, area)}
                      onRechazar={(area) => setRechazo({ cliId: f.cli.id, cliNom: f.cli.nom, areaId: area.id, areaNombre: area.nombre })}
                      onVer={(area, contrib) => setAporte({ cliNom: f.cli.nom, area, contrib })}
                      onPreview={() => accion(f.cli.id, 'preview')} onGuardar={() => accion(f.cli.id, 'guardar')} onExport={(t) => accion(f.cli.id, t)}
                      ocupado={ocupado?.cliId === f.cli.id ? ocupado.tipo : null} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      <RejectModal target={rechazo} onCancel={() => setRechazo(null)} onConfirm={confirmarRechazo} />
      <AporteModal info={aporte} onClose={() => setAporte(null)} />
      <Modal open={!!vista} onClose={() => setVista(null)} title={vista ? `Vista previa · ${getCli(vista.cliId)?.nom}` : ''} wide>
        {vista && (
          <>
            <iframe title="Vista previa del informe" srcDoc={vista.html} className="preview-frame" />
            <div className="brow">
              <button type="button" className="btn bvd" onClick={() => { const id = vista.cliId; setVista(null); accion(id, 'guardar'); }}>Guardar informe final</button>
              <button type="button" className="btn bgh" onClick={() => setVista(null)}>Cerrar</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
