/**
 * views/pages/guardados/EnviarCorreoModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * «Enviar por correo»: el ejecutivo revisa destinatarios, asunto y mensaje (la plantilla ya viene escrita con lo
 * más destacado del informe) y la aplicación deja el correo listo con el informe adjunto. Él pulsa «Enviar».
 */
import { useEffect, useState } from 'react';
import Modal from '../../common/Modal';
import { useToast } from '../../common/useToast';
import { fmtPerLong } from '../../../utils/format';
import { plantillaCorreo, correosDelCliente, revisarCorreos, prepararCorreo } from '../../../controllers/correoController';

export default function EnviarCorreoModal({ inf, user, onClose, onHecho }) {
  const toast = useToast();
  const [f, setF] = useState(null);
  const [trabajando, setTrabajando] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inf) { setF(null); return; }
    const p = plantillaCorreo(inf, user);
    setF({ para: correosDelCliente(inf.cliId), cc: '', asunto: p.asunto, cuerpo: p.cuerpo, pdf: true, html: true, recordar: true });
    setError('');
  }, [inf, user]);

  if (!inf || !f) return null;
  const set = (k) => (e) => setF(x => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const para = revisarCorreos(f.para);
  const cc = revisarCorreos(f.cc);

  const validar = () => {
    if (!para.ok) { setError(para.malos.length ? `Revisa estos correos: ${para.malos.join(', ')}` : 'Escribe al menos un correo del cliente en «Para».'); return false; }
    if (f.cc.trim() && !cc.ok) { setError(`Revisa los correos en copia: ${cc.malos.join(', ')}`); return false; }
    if (!f.asunto.trim()) { setError('El asunto no puede estar vacío.'); return false; }
    if (!f.pdf && !f.html) { setError('Elige al menos un archivo para adjuntar.'); return false; }
    setError('');
    return true;
  };

  const enviar = async (via) => {
    if (!validar()) return;
    // La pestaña de Gmail se abre en el mismo clic para que el navegador no la bloquee.
    const ventana = via === 'gmail' ? window.open('about:blank', '_blank') : null;
    setTrabajando(via);
    try {
      const adj = await prepararCorreo(inf, user, f, via, { ventana });
      toast(via === 'gmail' ? 'Borrador listo en Gmail con el informe adjunto. Revísalo y pulsa Enviar.' : `Se descargó el correo con ${adj.length} adjunto${adj.length === 1 ? '' : 's'}. Ábrelo con doble clic para enviarlo.`, 'ok');
      onHecho?.();
      onClose();
    } catch (e) {
      console.error(e);
      if (ventana && !ventana.closed) ventana.close();
      const cancelo = ['popup_closed', 'popup_failed_to_open', 'access_denied', 'popup'].includes(e?.codigo);
      setError(cancelo
        ? 'No se dio el permiso de Gmail. Puedes intentarlo otra vez o usar «Descargar correo (Outlook)».'
        : `No se pudo dejar el borrador en Gmail: ${e?.message || 'error desconocido'}. Puedes usar «Descargar correo (Outlook)» mientras tanto.`);
    }
    setTrabajando('');
  };

  return (
    <Modal open onClose={onClose} title={`Enviar por correo · ${inf.cliNom} · ${fmtPerLong(inf.per)}`} wide>
      <p className="text-muted" style={{ marginBottom: 10 }}>
        El correo ya viene escrito y con el informe adjunto. Revísalo, corrige lo que quieras y pulsa el botón: se abre listo para que solo le des «Enviar».
      </p>
      <div className="fg2">
        <div>
          <label className="flabel" htmlFor="co-para">Para (correos del cliente)</label>
          <input id="co-para" className="finput" value={f.para} onChange={set('para')} placeholder="persona@cliente.com, otra@cliente.com" />
        </div>
        <div>
          <label className="flabel" htmlFor="co-cc">Con copia (opcional)</label>
          <input id="co-cc" className="finput" value={f.cc} onChange={set('cc')} placeholder="tu.jefe@proservis.com.co" />
        </div>
      </div>
      <label className="chk" style={{ marginTop: 6 }}><input type="checkbox" checked={f.recordar} onChange={set('recordar')} /> Recordar estos destinatarios para este cliente</label>

      <div style={{ marginTop: 10 }}>
        <label className="flabel" htmlFor="co-asunto">Asunto</label>
        <input id="co-asunto" className="finput" value={f.asunto} onChange={set('asunto')} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="flabel" htmlFor="co-cuerpo">Mensaje</label>
        <textarea id="co-cuerpo" className="finput" rows={13} value={f.cuerpo} onChange={set('cuerpo')} style={{ fontFamily: 'inherit', lineHeight: 1.5 }} />
      </div>
      <div style={{ marginTop: 10 }}>
        <span className="flabel">Archivos adjuntos</span>
        <div className="brow">
          <label className="chk"><input type="checkbox" checked={f.pdf} onChange={set('pdf')} /> PDF (para leer o imprimir)</label>
          <label className="chk"><input type="checkbox" checked={f.html} onChange={set('html')} /> HTML (con gráficas interactivas)</label>
        </div>
      </div>

      {error && <div className="alrt ared" role="alert" style={{ marginTop: 10 }}>{error}</div>}

      <div className="brow" style={{ marginTop: 14 }}>
        <button type="button" className="btn bvd" onClick={() => enviar('gmail')} disabled={!!trabajando}>
          {trabajando === 'gmail' ? 'Preparando el correo…' : '✉️ Abrir en Gmail con el informe adjunto'}
        </button>
        <button type="button" className="btn bgh" onClick={() => enviar('eml')} disabled={!!trabajando}>
          {trabajando === 'eml' ? 'Preparando…' : 'Descargar correo (Outlook)'}
        </button>
        <button type="button" className="btn bgh" onClick={onClose} disabled={!!trabajando}>Cancelar</button>
      </div>
      <p className="fhint" style={{ marginTop: 8 }}>
        Gmail: la primera vez Google pide permiso para crear borradores (solo crea el borrador; no lee tu correo ni envía nada). Outlook: se descarga un archivo; ábrelo con doble clic y saldrá como correo nuevo con el informe adjunto.
      </p>
    </Modal>
  );
}
