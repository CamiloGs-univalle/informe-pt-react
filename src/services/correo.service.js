/**
 * services/correo.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Deja el correo del informe LISTO para enviar, con los archivos adjuntos y la plantilla ya escrita.
 *
 * Un navegador no puede adjuntar archivos con un enlace `mailto:`, así que hay dos caminos:
 *  1. Gmail (principal): se crea un BORRADOR con el adjunto usando la API de Gmail (permiso `gmail.compose`,
 *     que solo sirve para crear borradores: no lee el correo ni envía nada) y se abre en una pestaña nueva.
 *  2. Archivo .eml (respaldo para Outlook / Correo de Windows / Apple Mail): un mensaje ya armado que se abre con
 *     doble clic como correo nuevo, con los adjuntos incluidos.
 *
 * La persona siempre revisa y pulsa «Enviar» ella misma: la aplicación nunca envía el correo sola.
 */
import { GOOGLE_CLIENT_ID, GMAIL_SCOPE } from '../config/app.config';

const CRLF = '\r\n';

/** Texto UTF-8 → base64. */
const b64Texto = (t) => {
  const bytes = new TextEncoder().encode(t);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
/** Parte a líneas de 76 caracteres (requisito de MIME). */
const lineas76 = (b64) => (b64.match(/.{1,76}/g) || []).join(CRLF);
/** Asunto o nombre con tildes (RFC 2047). */
const palabraCodificada = (t) => (/^[\x20-\x7E]*$/.test(t) ? t : `=?UTF-8?B?${b64Texto(t)}?=`);
const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Quita saltos de línea para que un dato no pueda inyectar encabezados nuevos al correo. */
const sinSaltos = (t) => String(t || '').replace(/[\r\n]+/g, ' ').trim();

async function blobABase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Arma el mensaje completo (MIME). `adjuntos`: [{ nombre, tipo, blob }].
 * `noEnviado`: agrega `X-Unsent: 1` para que Outlook lo abra como borrador editable.
 */
export async function construirMime({ para = '', cc = '', asunto = '', cuerpo = '', adjuntos = [], noEnviado = false }) {
  const limite = '=_ps_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#12212D">${escHtml(cuerpo).replace(/\r?\n/g, '<br>')}</div>`;
  const enc = [
    'MIME-Version: 1.0',
    para ? 'To: ' + sinSaltos(para) : null,
    cc ? 'Cc: ' + sinSaltos(cc) : null,
    'Subject: ' + palabraCodificada(sinSaltos(asunto)),
    noEnviado ? 'X-Unsent: 1' : null,
    `Content-Type: multipart/mixed; boundary="${limite}"`,
  ].filter(Boolean).join(CRLF);

  const partes = [
    `--${limite}${CRLF}Content-Type: text/html; charset="UTF-8"${CRLF}Content-Transfer-Encoding: base64${CRLF}${CRLF}${lineas76(b64Texto(html))}`,
  ];
  for (const a of adjuntos) {
    const nombre = palabraCodificada(sinSaltos(a.nombre).replace(/"/g, ''));
    partes.push(`--${limite}${CRLF}Content-Type: ${a.tipo}; name="${nombre}"${CRLF}Content-Transfer-Encoding: base64${CRLF}Content-Disposition: attachment; filename="${nombre}"${CRLF}${CRLF}${lineas76(await blobABase64(a.blob))}`);
  }
  return enc + CRLF + CRLF + partes.join(CRLF) + CRLF + `--${limite}--` + CRLF;
}

/** Descarga el correo ya armado como archivo .eml (se abre con doble clic en Outlook, Correo o Apple Mail). */
export async function descargarEml(datos, nombreArchivo) {
  const mime = await construirMime({ ...datos, noEnviado: true });
  const url = URL.createObjectURL(new Blob([mime], { type: 'message/rfc822' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo.replace(/\.eml$/i, '') + '.eml';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ───────── Gmail ───────── */

let token = null; // { valor, vence }

function cargarScriptGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const previo = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    const s = previo || document.createElement('script');
    setTimeout(() => (window.google?.accounts?.oauth2 ? resolve() : reject(new Error('Google no respondió. Revisa tu conexión o que no esté bloqueado.'))), 10000);
    s.addEventListener('load', () => resolve());
    s.addEventListener('error', () => reject(new Error('No se pudo cargar el acceso de Google. Revisa tu conexión a internet.')));
    if (!previo) { s.src = 'https://accounts.google.com/gsi/client'; s.async = true; document.head.appendChild(s); }
  });
}

/** Pide a Google permiso para crear borradores (se muestra una ventana de Google la primera vez). */
async function pedirToken(correo) {
  if (token && token.vence > Date.now() + 30000) return token.valor;
  await cargarScriptGoogle();
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GMAIL_SCOPE,
      hint: correo || undefined,
      callback: (r) => {
        if (r.error) { reject(Object.assign(new Error(r.error_description || r.error), { codigo: r.error })); return; }
        token = { valor: r.access_token, vence: Date.now() + (Number(r.expires_in) || 3000) * 1000 };
        resolve(token.valor);
      },
      error_callback: (e) => reject(Object.assign(new Error(e?.message || 'Se cerró la ventana de permisos.'), { codigo: e?.type || 'popup' })),
    });
    cliente.requestAccessToken({ prompt: token ? '' : undefined });
  });
}

/**
 * Crea el borrador en Gmail con los adjuntos y lo abre en una pestaña nueva.
 * `ventana`: pestaña abierta en el mismo clic (así el navegador no la bloquea); si no, se abre una.
 */
export async function crearBorradorGmail(datos, { correoUsuario = '', ventana = null } = {}) {
  const acceso = await pedirToken(correoUsuario);
  const mime = await construirMime(datos);
  const r = await fetch('https://gmail.googleapis.com/upload/gmail/v1/users/me/drafts?uploadType=media', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + acceso, 'Content-Type': 'message/rfc822' },
    body: new Blob([mime], { type: 'message/rfc822' }),
  });
  if (!r.ok) {
    let detalle = '';
    try { detalle = (await r.json())?.error?.message || ''; } catch { /* sin detalle */ }
    token = null;
    throw Object.assign(new Error(detalle || 'Gmail no aceptó el borrador (' + r.status + ').'), { codigo: 'gmail_' + r.status });
  }
  const borrador = await r.json();
  const idMensaje = borrador?.message?.id;
  const base = 'https://mail.google.com/mail/u/' + encodeURIComponent(correoUsuario || '0') + '/';
  const destino = idMensaje ? base + '#drafts?compose=' + encodeURIComponent(idMensaje) : base + '#drafts';
  if (ventana && !ventana.closed) ventana.location.href = destino;
  else window.open(destino, '_blank', 'noopener');
  return destino;
}
