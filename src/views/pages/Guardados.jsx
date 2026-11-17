/**
 * views/pages/Guardados.jsx  (menú: "Informes guardados")
 * ─────────────────────────────────────────────────────────────────────────
 * Historial de informes de los clientes que la persona lidera (su equipo, si
 * es admin; todos, si es super admin): ver, descargar, calificar y eliminar.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DB } from '../../models/db';
import { deleteInf, updateInfRating, aprobarInf, quitarAprobacionInf, estaAprobado } from '../../models/Informe';
import { informesDe, puedeGestionarInforme, puedeAprobarInforme } from '../../models/Alcance';
import { EXIGIR_APROBACION } from '../../config/app.config';
import { MODULOS } from '../../models/constants';
import { fmtPerLong, fmtFechaHora, fmtNum, fmtDec, plural, periodoActual } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import { buildInformeFileName } from '../../controllers/informeController';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import ClienteLogo from '../common/ClienteLogo';
import Modal from '../common/Modal';
import Stars from '../common/Stars';
import EnviarCorreoModal from './guardados/EnviarCorreoModal';

const TEXTO_ESTRELLAS = ['Elige de 1 a 5 estrellas', 'Muy deficiente: hay que rehacerlo', 'Deficiente: faltaron datos clave', 'Aceptable, con oportunidades de mejora', 'Bueno: al cliente le gustó', 'Excelente: superó las expectativas'];

export default function Guardados({ user }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [busca, setBusca] = useState('');
  const [mes, setMes] = useState('');
  const [soloSinCalificar, setSoloSinCalificar] = useState(false);
  const [rate, setRate] = useState(null);
  const [rateVal, setRateVal] = useState(0);
  const [rateFeed, setRateFeed] = useState('');
  const [ver, setVer] = useState(null);
  const [bajando, setBajando] = useState('');
  const [correo, setCorreo] = useState(null);
  const [soloPendientes, setSoloPendientes] = useState(false);

  const lista = informesDe(user).map(inf => {
    const cli = DB.clis.find(c => c.id === inf.cliId);
    return { ...inf, cli, cliNom: cli?.nom || inf.cliNom || 'Cliente eliminado' };
  }).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));

  const meses = [...new Set(lista.map(i => i.per).filter(Boolean))].sort().reverse();
  const q = busca.trim().toLowerCase();
  const filtrados = lista.filter(i => (!q || i.cliNom.toLowerCase().includes(q) || fmtPerLong(i.per).toLowerCase().includes(q))
    && (!mes || i.per === mes) && (!soloSinCalificar || !i.rating) && (!soloPendientes || !estaAprobado(i)));

  const calificados = lista.filter(i => i.rating);
  const promedio = calificados.length ? calificados.reduce((s, i) => s + i.rating, 0) / calificados.length : null;
  const porAprobar = lista.filter(i => !estaAprobado(i)).length;
  const esteMes = lista.filter(i => i.per === periodoActual()).length;

  const nombreArchivo = (inf, ext) => (DB.clis.some(c => c.id === inf.cliId) ? buildInformeFileName(inf.cliId, inf.per, ext) : `Informe_${inf.cliNom}_${inf.per}.${ext}`);
  const descargarHTML = (inf) => { downloadHTML(inf.html, nombreArchivo(inf, 'html')); toast('Descargaste el informe en HTML.', 'ok'); };
  const descargarPDF = async (inf) => {
    setBajando(inf.id);
    try { await generatePDF(inf.html, nombreArchivo(inf, 'pdf')); toast('Descargaste el informe en PDF.', 'ok'); }
    catch (e) { console.error(e); toast('No se pudo generar el PDF.', 'error'); }
    setBajando('');
  };
  const eliminar = async (inf) => {
    const ok = await confirmar({ title: 'Eliminar informe', message: `Se borrará el informe de ${inf.cliNom} de ${fmtPerLong(inf.per)} del historial. Esta acción no se puede deshacer.`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    deleteInf(inf.id); refresh(); toast('Informe eliminado.', 'ok');
  };
  const aprobar = async (inf) => {
    const ok = await confirmar({ title: 'Aprobar informe', message: `Al aprobar el informe de ${inf.cliNom} de ${fmtPerLong(inf.per)}, ${inf.ejNom || 'el ejecutivo'} podrá enviarlo por correo al cliente. ¿Ya lo revisaste?`, confirmLabel: 'Aprobar' });
    if (!ok) return;
    aprobarInf(inf.id, user); refresh(); toast('Informe aprobado: el ejecutivo ya puede enviarlo por correo.', 'ok');
  };
  const quitarAprobacion = async (inf) => {
    const ok = await confirmar({ title: 'Quitar aprobación', message: 'El informe volverá a quedar pendiente y el ejecutivo no podrá enviarlo hasta que lo apruebes de nuevo.', confirmLabel: 'Quitar aprobación', danger: true });
    if (!ok) return;
    quitarAprobacionInf(inf.id); refresh(); toast('Aprobación retirada.', 'ok');
  };
  const abrirCalificar = (inf) => { setRate(inf); setRateVal(inf.rating || 0); setRateFeed(inf.feedback || ''); };
  const guardarCalificacion = () => {
    if (!rateVal) { toast('Elige cuántas estrellas le das al informe.', 'error'); return; }
    updateInfRating(rate.id, rateVal, rateFeed.trim());
    setRate(null); refresh(); toast('Calificación guardada.', 'ok');
  };

  return (
    <div>
      <PageHeader title="Informes guardados"
        subtitle="Los informes finales de tus clientes. Puedes verlos, descargarlos, calificarlos para mejorar el siguiente y eliminar los que ya no sirvan."
        actions={<Link to="/nuevo" className="btn bvd">+ Nuevo informe</Link>} />

      <div className="kgrid">
        <div className="kpi"><div className="kl">Informes guardados</div><div className="kv">{fmtNum(lista.length)}</div><div className="ks">Histórico</div></div>
        <div className="kpi am"><div className="kl">Calificados</div><div className="kv">{fmtNum(calificados.length)}</div><div className="ks">de {fmtNum(lista.length)}</div></div>
        <div className="kpi"><div className="kl">Este mes</div><div className="kv">{fmtNum(esteMes)}</div><div className="ks">{fmtPerLong(periodoActual())}</div></div>
        <div className="kpi am"><div className="kl">Calidad promedio</div><div className="kv">{promedio != null ? fmtDec(promedio) + ' ★' : '—'}</div><div className="ks">{promedio != null ? 'Sobre 5,0' : 'Aún sin calificaciones'}</div></div>
      </div>

      {!lista.length ? (
        <EmptyState icon="📚" title="Todavía no hay informes guardados" action={<Link to="/nuevo" className="btn bvd">Crear el primer informe</Link>}>
          Cuando guardes un informe desde “Nuevo informe” o desde el Tablero del equipo, aparecerá aquí.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <input className="finput grow" type="search" placeholder="Buscar por cliente o mes…" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar informes" />
            <select className="finput" style={{ width: 'auto' }} value={mes} onChange={e => setMes(e.target.value)} aria-label="Filtrar por mes">
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m} value={m}>{fmtPerLong(m)}</option>)}
            </select>
            {EXIGIR_APROBACION && <label className="chk"><input type="checkbox" checked={soloPendientes} onChange={e => setSoloPendientes(e.target.checked)} /> Pendientes de aprobar ({porAprobar})</label>}
            <label className="chk"><input type="checkbox" checked={soloSinCalificar} onChange={e => setSoloSinCalificar(e.target.checked)} /> Sin calificar</label>
            {(busca || mes || soloSinCalificar || soloPendientes) && <button type="button" className="btn bgh bsm" onClick={() => { setBusca(''); setMes(''); setSoloSinCalificar(false); setSoloPendientes(false); }}>Limpiar filtros</button>}
            <span className="count">{filtrados.length} de {lista.length}</span>
          </div>

          {!filtrados.length && <EmptyState icon="🔎" title="Ningún informe coincide con los filtros" />}

          <div className="stack-14">
            {filtrados.map(inf => {
              const gestiona = puedeGestionarInforme(user, inf);
              const aprueba = puedeAprobarInforme(user, inf);
              const aprobado = estaAprobado(inf);
              const puedeEnviar = gestiona && !!inf.html && (aprobado || !EXIGIR_APROBACION);
              const ultimoEnvio = (inf.envios || []).slice(-1)[0];
              const mods = (inf.activeModules || []).map(id => MODULOS.find(m => m.id === id)?.label || id);
              return (
                <article key={inf.id} className={'inf-card' + (inf.rating ? ' rated' : '')}>
                  <div className="inf-top">
                    <ClienteLogo cli={inf.cli || { nom: inf.cliNom }} size={46} />
                    <div className="inf-id">
                      <div className="inf-nom">{inf.cliNom}</div>
                      <div className="inf-meta"><span className="chip vd">{fmtPerLong(inf.per)}</span> {inf.ejNom || 'Sin ejecutivo'} · {fmtFechaHora(inf.ts)}</div>
                      {EXIGIR_APROBACION && (
                        <div className="inf-meta" style={{ marginTop: 4 }}>
                          {aprobado
                            ? <span className="chip vd">✔ Aprobado por {inf.aprobacion.porNom || 'un administrador'} · {fmtFechaHora(inf.aprobacion.ts)}</span>
                            : <span className="chip am">Pendiente de aprobación del administrador</span>}
                          {ultimoEnvio && <span className="chip">✉ Enviado por correo el {fmtFechaHora(ultimoEnvio.ts)}</span>}
                        </div>
                      )}
                      {inf.rating ? (
                        <div className="inf-rate"><Stars value={inf.rating} readonly size={16} /> <strong>{fmtDec(inf.rating)}</strong> de 5{inf.feedback && <span className="quote" style={{ marginTop: 0 }}>“{inf.feedback}”</span>}</div>
                      ) : <div className="text-muted" style={{ marginTop: 6 }}>Sin calificar</div>}
                    </div>
                    <div className="inf-btns">
                      <button type="button" className="btn bvd bsm" onClick={() => setVer(inf)} disabled={!inf.html}>Ver informe</button>
                      <button type="button" className="btn bgh bsm" onClick={() => descargarPDF(inf)} disabled={!inf.html || bajando === inf.id}>{bajando === inf.id ? 'Generando…' : 'PDF'}</button>
                      <button type="button" className="btn bgh bsm" onClick={() => descargarHTML(inf)} disabled={!inf.html}>HTML</button>
                      {EXIGIR_APROBACION && aprueba && !aprobado && <button type="button" className="btn bvd bsm" onClick={() => aprobar(inf)}>Aprobar</button>}
                      {EXIGIR_APROBACION && aprueba && aprobado && <button type="button" className="btn bgh bsm" onClick={() => quitarAprobacion(inf)}>Quitar aprobación</button>}
                      {gestiona && (puedeEnviar
                        ? <button type="button" className="btn bvd bsm" onClick={() => setCorreo(inf)}>✉️ Enviar por correo</button>
                        : <button type="button" className="btn bgh bsm" disabled title={!inf.html ? 'Este informe no tiene archivo para adjuntar.' : 'Disponible cuando un administrador apruebe el informe.'}>✉️ Enviar por correo · espera aprobación</button>)}
                      {gestiona && <button type="button" className="btn bgh bsm" onClick={() => abrirCalificar(inf)}>{inf.rating ? 'Cambiar calificación' : 'Calificar'}</button>}
                      {gestiona && <button type="button" className="btn bro bsm" onClick={() => eliminar(inf)}>Eliminar</button>}
                    </div>
                  </div>
                  {mods.length > 0 && <div className="inf-mods"><span className="text-muted">Incluye {plural(mods.length, 'módulo')}:</span> {mods.join(' · ')}</div>}
                </article>
              );
            })}
          </div>
        </>
      )}

      {correo && <EnviarCorreoModal inf={correo} user={user} onClose={() => setCorreo(null)} onHecho={refresh} />}

      <Modal open={!!ver} onClose={() => setVer(null)} title={ver ? `${ver.cliNom} · ${fmtPerLong(ver.per)}` : ''} wide>
        {ver && <iframe title="Informe" srcDoc={ver.html} className="preview-frame" />}
      </Modal>

      <Modal open={!!rate} onClose={() => setRate(null)} title={rate ? 'Calificar informe · ' + rate.cliNom : ''}>
        <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
          <p className="text-muted" style={{ marginBottom: 8 }}>¿Cómo le fue al cliente con este informe?</p>
          <Stars value={rateVal} onChange={setRateVal} size={34} />
          <div style={{ fontSize: 14, color: rateVal ? '#7A6010' : 'var(--grt)', marginTop: 8, fontWeight: 700 }}>{TEXTO_ESTRELLAS[rateVal]}</div>
        </div>
        <label className="flabel" htmlFor="rate-fb">Comentario para mejorar (opcional)</label>
        <textarea id="rate-fb" className="finput" rows={3} value={rateFeed} onChange={e => setRateFeed(e.target.value)} placeholder="Ej. Pidió más detalle de ausentismo para el próximo mes." />
        <div className="brow"><button type="button" className="btn bvd" onClick={guardarCalificacion} disabled={!rateVal}>Guardar calificación</button><button type="button" className="btn bgh" onClick={() => setRate(null)}>Cancelar</button></div>
      </Modal>
    </div>
  );
}
