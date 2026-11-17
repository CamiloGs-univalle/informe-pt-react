/**
 * controllers/correoController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Prepara el correo con el que el ejecutivo envía el informe al cliente: la plantilla (asunto y mensaje con lo más
 * destacado del mes), los adjuntos (PDF y/o HTML) y el envío a Gmail o al archivo .eml.
 * El mensaje sale de las mismas cifras del informe (`reportMetrics`), así nunca dice algo distinto a lo adjunto.
 */
import { DB } from '../models/db';
import { MODULOS } from '../models/constants';
import { nombrePeriodo, calcularMetricas, construirIndicadores, construirMensajes } from '../services/reportMetrics';
import { datosDeEstado, informePrevio, buildInformeFileName } from './informeController';
import { generatePDFBlob } from '../services/pdf.service';
import { crearBorradorGmail, descargarEml } from '../services/correo.service';
import { registrarEnvioInf } from '../models/Informe';
import { saveCli } from '../models/Cliente';

const lista = (arr, max) => arr.slice(0, max).map(t => '• ' + t).join('\n');

/** Asunto y mensaje listos para editar. Si algo falla al calcular las cifras, queda una versión sencilla. */
export function plantillaCorreo(inf, user) {
  const cli = DB.clis.find(c => c.id === inf.cliId);
  const cliNom = cli?.nom || inf.cliNom || 'su empresa';
  const mes = nombrePeriodo(inf.per);
  const active = Array.isArray(inf.activeModules) ? inf.activeModules : null;
  const secciones = (active || []).filter(id => id !== 'fotos').map(id => MODULOS.find(m => m.id === id)?.label).filter(Boolean);

  let destacados = ''; let vigilar = '';
  try {
    const d = datosDeEstado({ ...inf, cliId: inf.cliId, periodo: inf.per, ejecutivo: { nom: inf.ejNom }, obs: '' });
    const m = calcularMetricas(d, inf.seleccion || [], inf.rotacion || [], inf.sst?.casos || [], { ausentismo: inf.ausentismo, capacitacion: inf.capacitacion, clima: inf.clima, facturacion: inf.facturacion });
    const p = informePrevio(inf.cliId, inf.per);
    const prev = p ? calcularMetricas(p.d, p.rqs, p.motivos, p.casos, p.extras || {}) : null;
    const ind = construirIndicadores(m, active, prev);
    const msgs = construirMensajes(m, ind, active, { ausentismo: inf.ausentismo, clima: inf.clima }, prev);
    if (!m.vacio) { destacados = lista(msgs.bien, 3); vigilar = lista(msgs.vigilar, 3); }
  } catch (e) { console.warn('No se pudo resumir el informe para el correo:', e); }

  const firma = ['Atentamente,', user?.nom || inf.ejNom || 'Equipo Proservis', 'Proservis Temporales'].join('\n');
  const cuerpo = [
    'Cordial saludo,',
    '',
    `Compartimos el informe de gestión de ${cliNom} correspondiente a ${mes}.` + (secciones.length ? ` Incluye: ${secciones.join(', ')}.` : ''),
    destacados ? `\nLo más destacado del mes:\n${destacados}` : '',
    vigilar ? `\nPuntos que estamos vigilando:\n${vigilar}` : '',
    '',
    'Adjuntamos el informe en PDF. También va el archivo HTML, que se abre en cualquier navegador y permite ver las gráficas con su explicación.',
    '',
    'Quedamos atentos a cualquier inquietud o comentario.',
    '',
    firma,
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').replace(/\n{3,}/g, '\n\n');

  return { asunto: `Informe de gestión ${mes} · ${cliNom}`, cuerpo };
}

/** Destinatarios guardados para el cliente (campo opcional `correos`). */
export const correosDelCliente = (cliId) => DB.clis.find(c => c.id === cliId)?.correos || '';

/** Valida una lista de correos separados por coma, punto y coma o espacio. Devuelve { ok, lista, malos }. */
export function revisarCorreos(texto) {
  const lista = String(texto || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean);
  const malos = lista.filter(x => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x));
  return { ok: lista.length > 0 && !malos.length, lista, malos };
}

async function adjuntosDe(inf, { pdf, html }) {
  const salida = [];
  const base = (ext) => (DB.clis.some(c => c.id === inf.cliId) ? buildInformeFileName(inf.cliId, inf.per, ext) : `Informe_${inf.cliNom || 'Cliente'}_${inf.per}.${ext}`);
  if (pdf) salida.push({ nombre: base('pdf'), tipo: 'application/pdf', blob: await generatePDFBlob(inf.html, base('pdf')) });
  if (html) salida.push({ nombre: base('html'), tipo: 'text/html', blob: new Blob([inf.html], { type: 'text/html' }) });
  return { adjuntos: salida, base };
}

/**
 * Deja el correo listo.
 * @param {'gmail'|'eml'} via
 * @param {{para:string, cc:string, asunto:string, cuerpo:string, pdf:boolean, html:boolean, recordar:boolean}} f
 */
export async function prepararCorreo(inf, user, f, via, { ventana = null } = {}) {
  const { adjuntos, base } = await adjuntosDe(inf, f);
  const datos = { para: revisarCorreos(f.para).lista.join(', '), cc: revisarCorreos(f.cc).lista.join(', '), asunto: f.asunto, cuerpo: f.cuerpo, adjuntos };
  if (via === 'gmail') await crearBorradorGmail(datos, { correoUsuario: user?.email || '', ventana });
  else await descargarEml(datos, base('eml'));
  registrarEnvioInf(inf.id, user, { para: datos.para, via });
  if (f.recordar && datos.para) saveCli({ id: inf.cliId, correos: datos.para });
  return adjuntos.map(a => a.nombre);
}

