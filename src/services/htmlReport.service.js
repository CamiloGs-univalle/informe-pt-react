/**
 * services/htmlReport.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Arma el informe HTML que recibe el cliente final: un solo archivo, sin internet,
 * que se lee en pantalla (pestañas, gráficas con explicación al pasar el mouse),
 * se imprime y se convierte a PDF con todas las secciones.
 *
 * Quién hace qué:
 *   reportMetrics.js  → cifras, semáforos, comparación con el mes anterior, mensajes y textos didácticos
 *   reportCharts.js   → gráficas (SVG/HTML)
 *   reportStyles.js   → CSS y script
 *   este archivo      → ensambla las secciones
 *
 * Reglas: todo texto escrito por personas pasa por `esc()`/`parrafo()`; números y fechas en es-CO;
 * un módulo desactivado no se dibuja; si falta un dato se dice con palabras (nada inventado).
 */
import { logoDataUri } from '../assets/logo';
import { FOTOLABELS } from '../models/constants';
import { fmtNum, fmtDec, fmtMoney, plural } from '../utils/format.js';
import {
  calcularMetricas, construirIndicadores, construirMensajes, contarSemaforos,
  EXPLICA, glosarioDe, nombrePeriodo, METAS, moduloActivo, clasificarMotivo,
} from './reportMetrics.js';
import { esc, gauge, donut, leyenda, barras, cascada, panelMetas, comparar, COLOR } from './reportCharts.js';
import { REPORT_CSS, REPORT_JS } from './reportStyles.js';

/** Texto libre con saltos de línea → HTML seguro. */
const parrafo = (v) => esc(v).replace(/\r?\n/g, '<br>');
const hay = (v) => v != null && String(v).trim() !== '';

const CHIP = {
  ok: ['✔', 'En meta'], warn: ['●', 'Vigilar'], bad: ['▲', 'Atención'], info: ['ℹ', 'Informativo'],
};
const chip = (estado, texto) => `<span class="chip ${estado}">${CHIP[estado]?.[0] || ''} ${esc(texto || CHIP[estado]?.[1] || '')}</span>`;

const card = (titulo, cuerpo, { sub = '', cls = '' } = {}) =>
  `<section class="card ${cls}"><h3>${esc(titulo)}</h3>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}${cuerpo}</section>`;

/** Banner con el nombre del módulo y la pregunta que responde. */
const modHead = (clave, titulo, mes, cli) =>
  `<header class="mod-hd"><div class="k">${esc(mes)} · ${esc(cli)}</div><h2>${esc(titulo)}</h2><p class="q">${esc(EXPLICA[clave]?.pregunta || '')}</p></header>`;

/** "En una frase": la lectura del módulo para quien no es especialista. */
const lectura = (tono, texto) => {
  const ico = { ok: '✔', warn: '●', bad: '▲', info: 'ℹ' }[tono] || 'ℹ';
  return `<div class="lectura ${tono === 'ok' ? '' : tono}"><span class="li" aria-hidden="true">${ico}</span><div><strong>En una frase</strong>${esc(texto)}</div></div>`;
};

/** Tarjeta pequeña de cifra dentro de cada módulo. */
function kpi({ nombre, valor, unidad = '', estado = 'info', sub = '', meta = '', delta = null, ex = '' }) {
  const d = delta ? `<div class="delta ${delta.tono}"><span aria-hidden="true">${delta.flecha}</span>${esc(delta.texto)}</div>` : '';
  return `<article class="kpi ${estado}"><div class="kpi-hd"><span class="kpi-nom">${esc(nombre)}</span>${estado !== 'info' ? chip(estado) : ''}</div>`
    + `<div class="kpi-val${String(valor).length > 10 ? ' largo' : ''}">${esc(valor)}${unidad ? `<small>${esc(unidad)}</small>` : ''}</div>`
    + (meta ? `<div class="kpi-meta">${esc(meta)}</div>` : '')
    + (sub ? `<div class="kpi-sub">${esc(sub)}</div>` : '') + d
    + (ex ? `<div class="kpi-ex" style="display:block">${esc(ex)}</div>` : '')
    + '</article>';
}
const kpis = (...items) => `<div class="kpis">${items.filter(Boolean).map(kpi).join('')}</div>`;

/** "¿Qué significa y cómo se calcula?" plegable. */
function explicacion(clave) {
  const e = EXPLICA[clave]; if (!e) return '';
  return `<details class="expl"><summary>💡 ¿Qué significa y cómo se calcula?</summary><dl class="expl-b">`
    + `<div><dt>Qué mide</dt><dd>${esc(e.que)}</dd></div>`
    + (e.formula ? `<div><dt>Cómo se calcula</dt><dd><div class="formula">${esc(e.formula)}</div></dd></div>` : '')
    + `<div><dt>Cómo leerlo</dt><dd>${esc(e.leer)}</dd></div></dl></details>`;
}

const estadoDe = (ind, id) => ind.find(i => i.id === id);
const deltaDe = (ind, id) => estadoDe(ind, id)?.delta || null;

const TIPO = {
  estructural: { nombre: 'Estructural', color: '#607D8B', estado: 'gris', desc: 'Terminó la obra o labor para la que se contrató a la persona. No depende de la empresa.' },
  positivo: { nombre: 'Positivo', color: COLOR.info, estado: 'info', desc: 'La persona pasó a ser contratada directamente por el cliente.' },
  evitable: { nombre: 'Evitable', color: COLOR.warn, estado: 'warn', desc: 'Motivos sobre los que se puede actuar con acompañamiento y mejores condiciones.' },
  critico: { nombre: 'Crítico', color: COLOR.bad, estado: 'bad', desc: 'Abandono del puesto: suele indicar que algo falló en la inducción o el acompañamiento.' },
};

/* ───────────────────────── Secciones ───────────────────────── */

function secSeleccion(c) {
  const { m, rqs, ind } = c;
  const e = estadoDe(ind, 'seleccion')?.estado || 'info';
  let l;
  if (!m.hayRq) l = lectura('info', 'Este mes no se registraron vacantes (requerimientos) para este cliente.');
  else if (e === 'ok') l = lectura('ok', `Se cubrieron ${fmtNum(m.rqCon)} de ${fmtNum(m.rqSol)} vacantes (${fmtNum(m.pctSel)} %). La meta del 80 % está cumplida.`);
  else if (e === 'warn') l = lectura('warn', `Se cubrieron ${fmtNum(m.rqCon)} de ${fmtNum(m.rqSol)} vacantes (${fmtNum(m.pctSel)} %). Faltan ${fmtNum(m.rqPend)} para llegar a la meta del 80 %.`);
  else l = lectura('bad', `Solo se cubrieron ${fmtNum(m.rqCon)} de ${fmtNum(m.rqSol)} vacantes (${fmtNum(m.pctSel)} %). Está por debajo de 50 %: necesita atención inmediata.`);

  const filas = (rqs || []).map(r => {
    const sol = Number(r.solicitadas) || 0; const con = Number(r.contratadas) || 0;
    const pct = sol > 0 ? Math.round(con / sol * 100) : 0;
    const canc = String(r.nota || '').toLowerCase().includes('cancel');
    const est = canc ? 'gris' : pct >= 90 ? 'ok' : pct >= 50 ? 'warn' : 'bad';
    return `<tr><td>${esc(r.rq || '—')}</td><td>${esc(r.agencia || '—')}</td><td>${esc(r.ciudad || '—')}</td><td>${esc(r.cargo || '—')}</td><td class="c">${fmtNum(sol)}</td><td class="c">${fmtNum(con)}</td><td class="c">${fmtNum(Math.max(0, sol - con))}</td><td class="c">${chip(est, canc ? 'Cancelada' : fmtNum(pct) + ' %')}</td></tr>`;
  }).join('');
  const total = `<tr class="tot"><td colspan="4">Total</td><td class="c">${fmtNum(m.rqSol)}</td><td class="c">${fmtNum(m.rqCon)}</td><td class="c">${fmtNum(m.rqPend)}</td><td class="c">${fmtNum(m.pctSel)} %</td></tr>`;

  const porRq = (rqs || []).map((r, i) => {
    const sol = Number(r.solicitadas) || 0; const con = Number(r.contratadas) || 0;
    const pct = sol > 0 ? Math.round(con / sol * 100) : 0;
    const canc = String(r.nota || '').toLowerCase().includes('cancel');
    return { label: [r.rq, r.cargo].filter(Boolean).join(' · ') || 'Requerimiento ' + (i + 1), value: pct, color: canc ? COLOR.neutro : pct >= 90 ? COLOR.ok : pct >= 50 ? COLOR.warn : COLOR.bad, nota: `${con} de ${sol} vacantes${canc ? ' (cancelada)' : ''}` };
  });
  const don = [{ label: 'Contratadas', value: m.rqCon, color: COLOR.ok }, { label: 'Pendientes', value: m.rqPend, color: '#D5DDD8' }];

  return `<div id="t-sel" class="tab" role="tabpanel">${modHead('seleccion', 'Selección y contratación', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Vacantes solicitadas', valor: fmtNum(m.rqSol), sub: 'Lo que pidió la empresa' },
      { nombre: 'Contratadas', valor: fmtNum(m.rqCon), estado: m.hayRq ? e : 'info', sub: m.hayRq ? `${fmtNum(m.pctSel)} % de efectividad` : '', delta: deltaDe(ind, 'seleccion') },
      { nombre: 'Pendientes', valor: fmtNum(m.rqPend), estado: m.rqPend > 0 ? 'warn' : m.hayRq ? 'ok' : 'info', sub: m.rqPend > 0 ? 'Por cubrir' : 'Sin vacantes pendientes' },
    )
    + (m.hayRq ? `<div class="grid2">${card('Efectividad frente a la meta', `<div class="centro">${gauge(m.pctSel, { ok: METAS.seleccion.ok, warn: METAS.seleccion.warn, masEsMejor: true, etiqueta: 'Efectividad de selección' })}<p class="nota">Verde: 80 % o más · Ámbar: 50 % a 79 % · Rojo: menos de 50 %</p></div>`)}`
      + card('Vacantes: cubiertas y pendientes', `<div class="fila">${donut(don, { centro: fmtNum(m.pctSel) + ' %', sub: 'cubierto' })}${leyenda(don)}</div>`) + '</div>'
      + card('Cumplimiento por requerimiento', barras(porRq, { max: 100, meta: 80, sufijo: ' %', metaTexto: 'Meta 80 %' }), { sub: 'Cada barra es un requerimiento (RQ): qué porcentaje de sus vacantes ya se cubrió.' })
      + card('Detalle de requerimientos', `<div class="tw"><table><thead><tr><th>RQ</th><th>Agencia</th><th>Ciudad</th><th>Cargo</th><th class="c">Solicitadas</th><th class="c">Contratadas</th><th class="c">Pendientes</th><th class="c">Cumplimiento</th></tr></thead><tbody>${filas}${total}</tbody></table></div>`)
      : '')
    + explicacion('seleccion') + '</div>';
}

function secHeadcount(c) {
  const { m, ind, prev } = c;
  const l = m.sdHc ? lectura('info', 'Este mes no se registró el movimiento de personal.') : m.neto > 0 ? lectura('ok', `La planta creció en ${plural(m.neto, 'persona')}: pasó de ${fmtNum(m.hcInicio)} a ${fmtNum(m.hcCierre)} personas activas.`)
    : m.neto === 0 ? lectura('ok', `La planta se mantuvo estable en ${fmtNum(m.hcCierre)} personas activas.`)
      : lectura('warn', `La planta bajó en ${plural(-m.neto, 'persona')}: pasó de ${fmtNum(m.hcInicio)} a ${fmtNum(m.hcCierre)} personas activas.`);
  const cmp = prev ? card(`Frente a ${nombrePeriodo(prev.per)}`, comparar([
    { nombre: 'Activos al cierre', antes: prev.hcCierre, ahora: m.hcCierre },
    { nombre: 'Ingresos', antes: prev.hcIng, ahora: m.hcIng },
    { nombre: 'Retiros', antes: prev.hcRet, ahora: m.hcRet },
  ]) + `<div class="cmp-ley"><span><i style="background:#B8C4BC"></i>${esc(nombrePeriodo(prev.per))}</span><span><i style="background:var(--vd)"></i>${esc(c.mes)}</span></div>`) : '';
  return `<div id="t-hc" class="tab" role="tabpanel">${modHead('headcount', 'Administración de personal', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Al inicio del mes', valor: fmtNum(m.hcInicio), unidad: 'personas' },
      { nombre: 'Ingresos', valor: '+' + fmtNum(m.hcIng), unidad: 'personas', estado: 'info' },
      { nombre: 'Retiros', valor: '−' + fmtNum(m.hcRet), unidad: 'personas', estado: 'info' },
      { nombre: 'Al cierre', valor: fmtNum(m.hcCierre), unidad: 'personas', estado: m.neto >= 0 ? 'ok' : 'warn', sub: `${m.neto >= 0 ? '+' : '−'}${fmtNum(Math.abs(m.neto))} frente al inicio`, delta: deltaDe(ind, 'headcount') },
    )
    + card('Movimiento del mes', `<div class="centro">${cascada({ inicio: m.hcInicio, ingresos: m.hcIng, retiros: m.hcRet, cierre: m.hcCierre })}<p class="nota">Se lee de izquierda a derecha: las personas del inicio, más las que ingresaron, menos las que se retiraron, igual a las que quedaron.</p></div>`)
    + cmp + explicacion('headcount') + '</div>';
}

function secRotacion(c) {
  const { m, motivos, ind, d } = c;
  const e = estadoDe(ind, 'rotacion')?.estado || 'info';
  const lista = (motivos || []).filter(x => x.motivo && Number(x.cantidad) > 0).map(x => ({ ...x, cant: Number(x.cantidad), tipo: clasificarMotivo(x.motivo) }));
  let l;
  if (m.sdHc && m.totMot === 0) l = lectura('info', 'Este mes no se registraron retiros ni el movimiento de personal.');
  else if (m.totMot === 0) l = lectura('ok', 'No hubo retiros en el mes: la retención fue total.');
  else if (e === 'ok') l = lectura('ok', `Hubo ${plural(m.totMot, 'retiro')} (${fmtDec(m.tasaRot)} % del personal): dentro del nivel saludable de 3 %.`);
  else if (e === 'warn') l = lectura('warn', `Hubo ${plural(m.totMot, 'retiro')} (${fmtDec(m.tasaRot)} % del personal): supera el 3 % saludable y conviene revisarlo.`);
  else l = lectura('bad', `Hubo ${plural(m.totMot, 'retiro')} (${fmtDec(m.tasaRot)} % del personal): es una rotación alta, por encima del 6 %.`);

  const porMotivo = lista.map(x => ({ label: x.motivo, value: x.cant, color: TIPO[x.tipo].color, nota: `${fmtNum(Math.round(x.cant / m.totMot * 100))} % de los retiros · ${TIPO[x.tipo].nombre}` }));
  const porTipo = Object.keys(TIPO).map(k => ({ label: TIPO[k].nombre, value: m.porTipo[k], color: TIPO[k].color }));
  const filas = lista.map(x => `<tr><td>${esc(x.motivo)}</td><td class="c">${fmtNum(x.cant)}</td><td class="c">${fmtNum(Math.round(x.cant / m.totMot * 100))} %</td><td>${chip(TIPO[x.tipo].estado, TIPO[x.tipo].nombre)}</td></tr>`).join('')
    + `<tr class="tot"><td>Total</td><td class="c">${fmtNum(m.totMot)}</td><td class="c">100 %</td><td></td></tr>`;
  const tipos = '<ul class="leyenda" style="margin-top:12px">' + Object.keys(TIPO).filter(k => m.porTipo[k] > 0).map(k => `<li style="grid-template-columns:14px 1fr"><span class="sw" style="background:${TIPO[k].color}"></span><span><strong>${TIPO[k].nombre}:</strong> ${esc(TIPO[k].desc)}</span></li>`).join('') + '</ul>';

  return `<div id="t-rot" class="tab" role="tabpanel">${modHead('rotacion', 'Rotación de personal', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Retiros del mes', valor: fmtNum(m.totMot), unidad: m.totMot === 1 ? 'persona' : 'personas', sub: `Sobre ${fmtNum(m.hcCierre)} personas activas` },
      { nombre: 'Tasa de rotación', valor: fmtDec(m.tasaRot) + ' %', estado: e, meta: 'Saludable: hasta 3 %', delta: deltaDe(ind, 'rotacion') },
      { nombre: 'Retiros evitables', valor: fmtNum(m.porTipo.evitable), estado: m.porTipo.evitable > 0 ? 'warn' : 'ok', sub: 'Los que se pueden prevenir' },
    )
    + (m.totMot > 0
      ? `<div class="grid2">${card('Rotación frente a la meta', `<div class="centro">${gauge(m.tasaRot, { max: 10, ok: METAS.rotacion.ok, warn: METAS.rotacion.warn, masEsMejor: false, decimales: 1, etiqueta: 'Tasa de rotación' })}<p class="nota">Verde: hasta 3 % · Ámbar: 3 % a 6 % · Rojo: más de 6 %</p></div>`)}`
        + card('¿De qué tipo fueron los retiros?', `<div class="fila">${donut(porTipo, { centro: fmtNum(m.totMot), sub: m.totMot === 1 ? 'retiro' : 'retiros' })}${leyenda(porTipo)}</div>${tipos}`) + '</div>'
        + card('Motivos de retiro', barras(porMotivo, { sufijo: '' }))
        + card('Detalle', `<div class="tw"><table><thead><tr><th>Motivo</th><th class="c">Cantidad</th><th class="c">Porcentaje</th><th>Tipo</th></tr></thead><tbody>${filas}</tbody></table></div>`)
      : card('Retiros del mes', '<p class="vacio">No se registraron retiros este mes.</p>'))
    + (hay(d.rotObs) ? card('Observaciones', `<p>${parrafo(d.rotObs)}</p>`) : '')
    + explicacion('rotacion') + '</div>';
}

/** Subsección «Tasa de accidentalidad por sede» (módulo sst_tasa). */
function bloqueTasa(c) {
  const { m, ind } = c;
  const e = estadoDe(ind, 'sst_tasa');
  if (!m.hayTasa) return lectura('info', 'Este mes no se registró la tasa de accidentalidad (faltan los accidentes y las personas expuestas por sede).');
  const est = e?.estado || 'info';
  const l = est === 'ok' ? lectura('ok', `La tasa de accidentalidad fue de ${fmtDec(m.tasaAT)} %: está dentro de la meta de 1 %.`)
    : lectura(est, `La tasa de accidentalidad fue de ${fmtDec(m.tasaAT)} %: supera la meta de 1 %. Conviene revisar dónde ocurrieron los accidentes.`);
  const conTasa = m.sedes.filter(x => x.tasa != null);
  const colorDe = (t) => (t <= METAS.tasaAT.ok ? COLOR.ok : t <= METAS.tasaAT.warn ? COLOR.warn : COLOR.bad);
  const grafica = conTasa.length ? card('Tasa por sede', barras(conTasa.map(x => ({ label: x.sede, value: x.tasa, color: colorDe(x.tasa), nota: `${fmtNum(x.at)} ${x.at === 1 ? 'accidente' : 'accidentes'} · ${fmtNum(x.expuestos)} personas expuestas` })), { meta: METAS.tasaAT.ok, metaTexto: 'Meta 1 %', sufijo: ' %', fmt: fmtDec, max: Math.max(METAS.tasaAT.warn, ...conTasa.map(x => x.tasa)) }),
    { sub: 'Mientras más corta la barra, mejor. La marca vertical es la meta (1 %).' }) : '';
  const filas = m.sedes.map(x => `<tr><td><strong>${esc(x.sede)}</strong></td><td class="c">${fmtNum(x.at)}</td><td class="c">${fmtNum(x.expuestos)}</td><td class="c">${x.tasa == null ? '—' : fmtDec(x.tasa) + ' %'}</td><td>${x.tasa == null ? chip('info', 'Sin datos') : chip(estadoDeTasa(x.tasa))}</td></tr>`).join('');
  const tabla = m.sedes.length ? card('Detalle por sede', `<div class="tw"><table><thead><tr><th>Sede</th><th class="c">Accidentes</th><th class="c">Personas expuestas</th><th class="c">Tasa</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table></div>`) : '';
  const nota = m.tasaOrigen === 'headcount' ? '<p class="nota">No se registraron las personas expuestas por sede: la tasa se calculó con el personal activo al cierre del mes.</p>' : '';
  return `<div class="sub-mod"><h3 class="sub-t">📈 Tasa de accidentalidad</h3>${l}`
    + kpis({ nombre: 'Tasa de accidentalidad', valor: fmtDec(m.tasaAT) + ' %', estado: est, meta: 'Meta: hasta 1 %', delta: e?.delta || null, sub: m.sedes.length > 1 ? `${fmtNum(m.sedes.length)} sedes reportadas` : 'Accidentes sobre personas expuestas' })
    + grafica + tabla + nota + explicacion('sst_tasa') + '</div>';
}
const estadoDeTasa = (t) => (t <= METAS.tasaAT.ok ? 'ok' : t <= METAS.tasaAT.warn ? 'warn' : 'bad');

/** Subsección «Severidad de los accidentes» (módulo sst_severidad). */
function bloqueSeveridad(c) {
  const { m, ind } = c;
  const e = estadoDe(ind, 'sst_severidad');
  const l = m.sevDias === 0 ? lectura('ok', 'Ningún accidente generó días perdidos de trabajo este mes.')
    : lectura('warn', `Los accidentes dejaron ${fmtNum(m.sevDias)} ${m.sevDias === 1 ? 'día perdido' : 'días perdidos'} de trabajo${m.sevConDias > 0 ? `, en ${plural(m.sevConDias, 'accidente con incapacidad', 'accidentes con incapacidad')}` : ''}.`);
  return `<div class="sub-mod"><h3 class="sub-t">⚠️ Severidad de los accidentes</h3>${l}`
    + kpis(
      { nombre: 'Días perdidos por AT', valor: fmtNum(m.sevDias), estado: e?.estado || 'info', meta: 'Meta: cero', delta: e?.delta || null, sub: 'Suma de días de incapacidad' },
      m.sevConDias > 0 ? { nombre: 'Accidentes con incapacidad', valor: fmtNum(m.sevConDias), sub: `De ${plural(m.at, 'accidente del mes', 'accidentes del mes')}` } : null,
      m.sevConDias > 0 ? { nombre: 'Promedio por accidente', valor: fmtDec(m.sevProm), unidad: 'días', sub: 'Días perdidos ÷ accidentes con incapacidad' } : null,
    )
    + explicacion('sst_severidad') + '</div>';
}

/** Subsección «Investigación de los accidentes» (módulo sst_investigacion). */
function bloqueInvestigacion(c) {
  const { m, ind } = c;
  const e = estadoDe(ind, 'sst_investigacion');
  if (m.invTotal === 0) {
    return `<div class="sub-mod"><h3 class="sub-t">🔍 Investigación de los accidentes</h3>`
      + (m.at === 0 ? lectura('ok', 'No hubo accidentes que investigar este mes.') : lectura('info', 'Este mes no se registró cuántos accidentes se investigaron.'))
      + explicacion('sst_investigacion') + '</div>';
  }
  const est = e?.estado || 'info';
  const pend = Math.max(0, m.invTotal - m.invHechos);
  const l = pend === 0 ? lectura('ok', `Se investigaron los ${plural(m.invTotal, 'accidente', 'accidentes')} del mes (${fmtNum(Math.round(m.invPct))} %).`)
    : lectura(est, `Se investigaron ${fmtNum(m.invHechos)} de ${plural(m.invTotal, 'accidente', 'accidentes')} (${fmtNum(Math.round(m.invPct))} %). Faltan ${fmtNum(pend)} por cerrar.`);
  return `<div class="sub-mod"><h3 class="sub-t">🔍 Investigación de los accidentes</h3>${l}`
    + kpis(
      { nombre: 'Cumplimiento de la investigación', valor: fmtNum(Math.round(m.invPct)) + ' %', estado: est, meta: 'Meta: 100 %', delta: e?.delta || null, sub: `${fmtNum(m.invHechos)} de ${fmtNum(m.invTotal)} investigados` },
      m.invTiempo > 0 ? { nombre: 'Dentro del plazo (15 días)', valor: fmtNum(m.invTiempo), sub: `${fmtNum(Math.round(m.invTiempoPct))} % de los accidentes` } : null,
      { nombre: 'Pendientes', valor: fmtNum(pend), estado: pend > 0 ? 'warn' : 'ok', sub: pend > 0 ? 'Por investigar' : 'Todo al día' },
    )
    + card('Avance de la investigación', barras([
      { label: 'Accidentes por investigar', value: m.invTotal, color: '#607D8B' },
      { label: 'Investigados', value: m.invHechos, color: COLOR.ok },
      m.invTiempo > 0 ? { label: 'A tiempo (15 días)', value: m.invTiempo, color: COLOR.info } : null,
    ].filter(Boolean), { max: Math.max(m.invTotal, 1) }))
    + explicacion('sst_investigacion') + '</div>';
}

function bloqueGeneralSST(c) {
  const { m, ind, casos, d } = c;
  const l = m.at === 0 ? lectura('ok', 'No hubo accidentes de trabajo en el mes.')
    : lectura(m.at === 1 ? 'warn' : 'bad', `Hubo ${plural(m.at, 'accidente de trabajo', 'accidentes de trabajo')} en el mes. Conviene revisar qué lo causó y cómo evitar que se repita.`);
  const eventos = [
    { label: 'Accidentes de trabajo (AT)', value: m.at, color: m.at > 0 ? COLOR.bad : COLOR.ok },
    { label: 'Origen común o tránsito (OC)', value: m.oc, color: COLOR.warn },
    { label: 'Licencias de maternidad', value: m.mat, color: COLOR.info },
    { label: 'Casos médicos en seguimiento', value: m.casos, color: '#607D8B' },
  ];
  const filas = (casos || []).map((x, i) => {
    const origen = x.origen === 'AT laboral' ? 'bad' : x.origen === 'Lic. maternidad' ? 'info' : 'gris';
    const est = String(x.estado || '').toLowerCase();
    const estado = est.includes('alta') || est.includes('labor') ? 'ok' : est.includes('incap') ? 'bad' : 'warn';
    const tg = x.seguimiento ? `<button type="button" class="tg" data-row="cs${i}" aria-expanded="false" aria-label="Ver seguimiento del caso ${i + 1}">+</button>` : '';
    return `<tr><td>${i + 1}</td><td><strong>${esc(x.nombre || '—')}</strong></td><td>${esc(x.identificacion || '—')}</td><td>${esc(x.cie10 || '—')}</td><td>${esc(x.ciudad || '—')}</td><td>${chip(origen, x.origen || '—')}</td><td>${chip(estado, x.estado || '—')}</td><td>${tg}</td></tr>`
      + (x.seguimiento ? `<tr id="cs${i}" class="seg-row"><td colspan="8"><strong>Seguimiento:</strong> ${parrafo(x.seguimiento)}</td></tr>` : '');
  }).join('');
  const conTasaPropia = moduloActivo(c.active, 'sst_tasa');
  return `<div class="sub-mod"><h3 class="sub-t">🛡️ Resumen de seguridad y salud</h3>${l}`
    + kpis(
      { nombre: 'Accidentes de trabajo', valor: fmtNum(m.at), estado: m.at === 0 ? 'ok' : m.at === 1 ? 'warn' : 'bad', meta: 'Meta: cero', delta: deltaDe(ind, 'sst') },
      !conTasaPropia && m.hayTasa ? { nombre: 'Tasa de accidentalidad', valor: fmtDec(m.tasaAT) + ' %', sub: 'Accidentes sobre personas activas' } : null,
      { nombre: 'Origen común o tránsito', valor: fmtNum(m.oc), sub: 'Eventos que no son del trabajo' },
      { nombre: 'Licencias de maternidad', valor: fmtNum(m.mat) },
      { nombre: 'Días perdidos (E.G.)', valor: fmtNum(m.eg), sub: 'Por enfermedad general' },
      { nombre: 'Cobertura ARL', valor: fmtNum(m.arl) + ' %', sub: 'Personas afiliadas a la ARL' },
      { nombre: 'Inducciones SST', valor: fmtNum(m.ind), sub: 'Personas inducidas en el mes' },
      { nombre: 'Casos médicos', valor: fmtNum(m.casos), estado: m.casos > 0 ? 'warn' : 'ok', sub: m.casos ? 'En seguimiento' : 'Sin casos en seguimiento' },
    )
    + card('Eventos del mes', barras(eventos), { sub: 'Cuántos eventos hubo de cada tipo. Pasa el mouse o toca una barra para ver su explicación.' })
    + (filas ? card('Casos médicos en seguimiento', `<div class="tw"><table><thead><tr><th>#</th><th>Persona</th><th>Identificación</th><th>Diagnóstico (CIE-10)</th><th>Ciudad</th><th>Origen</th><th>Estado</th><th><span class="sr">Ver seguimiento</span></th></tr></thead><tbody>${filas}</tbody></table></div><p class="nota no-print" style="margin-top:8px">Toca el botón + de cada fila para leer el seguimiento del caso.</p>`) : '')
    + (hay(d.sstObs) ? card('Observaciones de SST', `<p>${parrafo(d.sstObs)}</p>`) : '')
    + explicacion('sst') + '</div>';
}

/** Pestaña de seguridad y salud: un bloque por cada módulo de SST que se reporta a este cliente. */
function secSST(c) {
  const on = (id) => moduloActivo(c.active, id);
  return `<div id="t-sst" class="tab" role="tabpanel">${modHead('sst', 'Seguridad y salud en el trabajo', c.mes, c.cli)}`
    + (on('sst') ? bloqueGeneralSST(c) : '')
    + (on('sst_tasa') ? bloqueTasa(c) : '')
    + (on('sst_severidad') ? bloqueSeveridad(c) : '')
    + (on('sst_investigacion') ? bloqueInvestigacion(c) : '')
    + '</div>';
}

function secNomina(c) {
  const { m, ind, d } = c;
  const l = m.nerr === 0 ? lectura('ok', m.nliq > 0 ? `La nómina se liquidó sin errores para ${plural(m.nliq, 'persona')}.` : 'No se reportaron errores en la nómina.')
    : lectura('bad', `Se encontraron ${plural(m.nerr, 'error', 'errores')} en la liquidación de nómina. Hay que verificarlos y reprocesarlos.`);
  const nov = [
    { label: 'Incapacidades', value: m.ninc, color: COLOR.warn },
    { label: 'Licencias', value: m.nlic, color: COLOR.info },
    { label: 'Horas extras diurnas', value: m.nhed, color: COLOR.ok },
    { label: 'Horas extras nocturnas', value: m.nhen, color: '#7B68EE' },
  ];
  return `<div id="t-nom" class="tab" role="tabpanel">${modHead('nomina', 'Nómina', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Personas liquidadas', valor: fmtNum(m.nliq) },
      { nombre: 'Errores de nómina', valor: fmtNum(m.nerr), estado: m.nerr === 0 ? 'ok' : 'bad', meta: 'Meta: cero', delta: deltaDe(ind, 'nomina') },
      { nombre: 'Incapacidades', valor: fmtNum(m.ninc) },
      { nombre: 'Licencias', valor: fmtNum(m.nlic) },
    )
    + card('Novedades del mes', barras(nov), { sub: 'Lo que movió la nómina este mes además del salario base.' })
    + (hay(d.nobs) ? card('Observaciones', `<p>${parrafo(d.nobs)}</p>`) : '')
    + explicacion('nomina') + '</div>';
}

function secAusentismo(c) {
  const { m, ind, extras } = c;
  const aus = extras.ausentismo || c.d.ausentismo || {};
  const e = estadoDe(ind, 'ausentismo')?.estado || 'info';
  const l = e === 'ok' ? lectura('ok', `El ausentismo fue de ${fmtDec(m.ausTasa)} %: dentro de la meta de 2 %.`)
    : e === 'warn' ? lectura('warn', `El ausentismo fue de ${fmtDec(m.ausTasa)} %: supera la meta de 2 % y conviene vigilarlo.`)
      : lectura('bad', `El ausentismo fue de ${fmtDec(m.ausTasa)} %: es alto, por encima del 4 %.`);
  return `<div id="t-aus" class="tab" role="tabpanel">${modHead('ausentismo', 'Ausentismo', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Tasa de ausentismo', valor: fmtDec(m.ausTasa) + ' %', estado: e, meta: 'Meta: hasta 2 %', delta: deltaDe(ind, 'ausentismo') },
      { nombre: 'Horas de ausencia', valor: fmtNum(m.ausHoras) },
      { nombre: 'Eventos', valor: fmtNum(m.ausEventos), sub: 'Veces que alguien se ausentó' },
      { nombre: 'Días perdidos', valor: fmtNum(m.ausDias) },
    )
    + `<div class="grid2">${card('Ausentismo frente a la meta', `<div class="centro">${gauge(m.ausTasa, { max: 8, ok: METAS.ausentismo.ok, warn: METAS.ausentismo.warn, masEsMejor: false, decimales: 1, etiqueta: 'Tasa de ausentismo' })}<p class="nota">Verde: hasta 2 % · Ámbar: 2 % a 4 % · Rojo: más de 4 %</p></div>`)}`
    + card('Principales causas', hay(aus.causas) ? `<p>${parrafo(aus.causas)}</p>` : '<p class="vacio">No se registraron las causas de este mes.</p>') + '</div>'
    + (hay(aus.obs) ? `<div class="lectura warn"><span class="li" aria-hidden="true">→</span><div><strong>Plan de acción</strong>${parrafo(aus.obs)}</div></div>` : '')
    + explicacion('ausentismo') + '</div>';
}

function secCapacitacion(c) {
  const { m, extras } = c;
  const cap = extras.capacitacion || c.d.capacitacion || {};
  const temas = (cap.temas || []).filter(t => hay(t.tema));
  const l = m.capHoras > 0 ? lectura('ok', `Se dieron ${fmtNum(m.capHoras)} horas de formación a ${plural(m.capPersonas, 'persona')}${m.capCobertura ? ` (${fmtNum(m.capCobertura)} % del personal)` : ''}.`)
    : lectura('info', 'Este mes no se registraron horas de formación.');
  const cob = Math.max(0, Math.min(100, m.capCobertura));
  const don = [{ label: 'Con formación', value: cob, color: COLOR.ok }, { label: 'Sin formación este mes', value: 100 - cob, color: '#D5DDD8' }];
  const filas = temas.map(t => `<tr><td>${esc(t.tema)}</td><td class="c">${fmtNum(t.asistentes ?? 0)}</td><td class="c">${fmtNum(t.horas ?? 0)}</td></tr>`).join('');
  return `<div id="t-cap" class="tab" role="tabpanel">${modHead('capacitacion', 'Capacitación y formación', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Horas de formación', valor: fmtNum(m.capHoras), unidad: 'horas', delta: deltaDe(c.ind, 'capacitacion') },
      { nombre: 'Personas capacitadas', valor: fmtNum(m.capPersonas) },
      { nombre: 'Cobertura', valor: fmtNum(m.capCobertura) + ' %', sub: 'Del total del personal' },
    )
    + (m.capCobertura > 0 || temas.length ? `<div class="grid2">${card('Cobertura de la formación', `<div class="fila">${donut(don, { centro: fmtNum(cob) + ' %', sub: 'del personal' })}${leyenda(don.map(x => ({ ...x, value: x.value })))}</div>`)}`
      + card('Horas por tema', temas.length ? barras(temas.map(t => ({ label: t.tema, value: Number(t.horas) || 0, nota: `${fmtNum(t.asistentes ?? 0)} asistentes`, color: COLOR.ok })), { sufijo: ' h' }) : '<p class="vacio">No se registraron temas.</p>') + '</div>' : '')
    + (filas ? card('Temas impartidos', `<div class="tw"><table><thead><tr><th>Tema</th><th class="c">Asistentes</th><th class="c">Horas</th></tr></thead><tbody>${filas}</tbody></table></div>`) : '')
    + (hay(cap.obs) ? card('Observaciones', `<p>${parrafo(cap.obs)}</p>`) : '')
    + explicacion('capacitacion') + '</div>';
}

function secClima(c) {
  const { m, ind, extras } = c;
  const clima = extras.clima || c.d.clima || {};
  const e = estadoDe(ind, 'clima')?.estado || 'info';
  const l = m.sdClima ? lectura('info', 'Este mes no se registraron los resultados de la encuesta de clima.') : e === 'ok' ? lectura('ok', `La satisfacción del personal es de ${fmtNum(m.satisfaccion)} %: supera la meta de 85 %.`)
    : e === 'warn' ? lectura('warn', `La satisfacción del personal es de ${fmtNum(m.satisfaccion)} %: está cerca de la meta de 85 %, pero todavía no la alcanza.`)
      : lectura('bad', `La satisfacción del personal es de ${fmtNum(m.satisfaccion)} %: está bastante por debajo de la meta de 85 %.`);
  const enpsTxt = m.enps >= 30 ? ['ok', 'Muy bueno'] : m.enps >= 0 ? ['info', 'Positivo'] : ['bad', 'Por mejorar'];
  return `<div id="t-clima" class="tab" role="tabpanel">${modHead('clima', 'Clima laboral y bienestar', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Satisfacción', valor: fmtNum(m.satisfaccion) + ' %', estado: e, meta: 'Meta: 85 % o más', delta: deltaDe(ind, 'clima') },
      { nombre: 'eNPS', valor: fmtNum(m.enps), estado: enpsTxt[0] === 'info' ? 'info' : enpsTxt[0], sub: `Lectura: ${enpsTxt[1].toLowerCase()} (va de −100 a +100)` },
      { nombre: 'Participación', valor: fmtNum(m.participacion) + ' %', sub: 'De las personas que contestaron la encuesta' },
      { nombre: 'Actividades de bienestar', valor: fmtNum(m.actividades) },
    )
    + (m.sdClima ? '' : card('Satisfacción frente a la meta', `<div class="centro">${gauge(m.satisfaccion, { ok: METAS.satisfaccion.ok, warn: METAS.satisfaccion.warn, masEsMejor: true, etiqueta: 'Satisfacción del personal' })}<p class="nota">Verde: 85 % o más · Ámbar: 70 % a 84 % · Rojo: menos de 70 %</p></div>`))
    + (hay(clima.encuesta) ? card('La voz del personal', `<p style="font-style:italic">“${parrafo(clima.encuesta)}”</p>`) : '')
    + (hay(clima.plan) ? `<div class="lectura"><span class="li" aria-hidden="true">→</span><div><strong>Plan de mejora</strong>${parrafo(clima.plan)}</div></div>` : '')
    + explicacion('clima') + '</div>';
}

function secFacturacion(c) {
  const { m, extras } = c;
  const fac = extras.facturacion || c.d.facturacion || {};
  const e = m.facEstado === 'Al día' ? 'ok' : m.facEstado === 'En mora' ? 'bad' : 'warn';
  const l = m.sdFac ? lectura('info', 'Este mes no se registró información de facturación.') : e === 'ok' ? lectura('ok', 'La facturación está al día: no hay pagos vencidos.')
    : e === 'bad' ? lectura('bad', 'La facturación figura en mora: hay pagos vencidos por regularizar.')
      : lectura('warn', `La facturación figura como “${m.facEstado}”.`);
  return `<div id="t-fac" class="tab" role="tabpanel">${modHead('facturacion', 'Facturación y financiero', c.mes, c.cli)}${l}`
    + kpis(
      { nombre: 'Valor facturado', valor: fmtMoney(m.facValor) },
      { nombre: 'Costo de nómina', valor: fmtMoney(m.facCosto) },
      { nombre: 'Margen', valor: fmtNum(m.facMargen) + ' %' },
      { nombre: 'Estado de pagos', valor: m.facEstado, estado: e },
      { nombre: 'Días de cartera', valor: fmtNum(m.facCartera), unidad: 'días', sub: 'Tiempo promedio de cobro' },
    )
    + card('Cumplimiento de pagos', barras([{ label: 'Pagos cumplidos', value: Math.max(0, Math.min(100, m.facCumplimiento)), color: e === 'bad' ? COLOR.bad : COLOR.ok }], { max: 100, sufijo: ' %' }))
    + (hay(fac.obs) ? card('Observaciones financieras', `<p>${parrafo(fac.obs)}</p>`) : '')
    + explicacion('facturacion') + '</div>';
}

function secFotos(c) {
  const fotos = c.fotos || {};
  const items = [];
  for (let i = 0; i < 9; i++) if (fotos[i]) items.push(`<figure class="foto"><img src="${esc(fotos[i])}" alt="${esc(FOTOLABELS[i])}" loading="lazy"><figcaption>${esc(FOTOLABELS[i])}</figcaption></figure>`);
  return `<div id="t-act" class="tab" role="tabpanel"><header class="mod-hd"><div class="k">${esc(c.mes)} · ${esc(c.cli)}</div><h2>Actividades del mes</h2><p class="q">¿Qué se hizo en el sitio de trabajo?</p></header>`
    + (items.length ? card('Registro fotográfico', `<div class="fotos">${items.join('')}</div><p class="nota no-print" style="margin-top:8px">Toca una foto para verla en grande.</p>`) : card('Registro fotográfico', '<p class="vacio">Este mes no se cargaron fotos.</p>'))
    + '</div>';
}

/* ───────────────────────── Resumen ───────────────────────── */

function secResumen(c) {
  const { m, ind, msgs, prev, active } = c;
  const cnt = contarSemaforos(ind);
  const evaluados = cnt.ok + cnt.warn + cnt.bad;
  const mesPrev = prev ? nombrePeriodo(prev.per) : '';
  let tono = 'ok'; let titular; let sub;
  if (m.vacio) { tono = 'info'; titular = 'Todavía no hay cifras cargadas para este mes'; sub = 'Cuando el equipo registre la información, aquí verás el resumen con sus semáforos.'; }
  else if (!evaluados) { titular = 'Resumen del mes'; sub = 'Estas son las cifras del período.'; }
  else if (cnt.bad > 0) { tono = 'bad'; titular = `${plural(cnt.bad, 'indicador necesita', 'indicadores necesitan')} atención este mes`; sub = `${fmtNum(cnt.ok)} de ${fmtNum(evaluados)} indicadores cumplen su meta.`; }
  else if (cnt.warn > 0) { tono = 'warn'; titular = `Buen mes, con ${plural(cnt.warn, 'punto', 'puntos')} para vigilar`; sub = `${fmtNum(cnt.ok)} de ${fmtNum(evaluados)} indicadores cumplen su meta.`; }
  else { titular = 'Mes sólido: todos los indicadores están en meta'; sub = `${fmtNum(cnt.ok)} de ${fmtNum(evaluados)} indicadores cumplen su meta.`; }
  if (prev) {
    const mej = ind.filter(i => i.delta?.tono === 'ok').length; const peo = ind.filter(i => i.delta?.tono === 'bad').length;
    sub += ` Frente a ${mesPrev}: ${plural(mej, 'mejoró', 'mejoraron')} y ${plural(peo, 'empeoró', 'empeoraron')}.`;
  }
  const sem = (k, texto) => `<div class="sem ${k}${cnt[k] ? '' : ' cero'}"><b>${fmtNum(cnt[k])}</b><span>${CHIP[k][0]} ${texto}</span></div>`;

  const tarjetas = ind.map(i => {
    const delta = i.delta ? `<div class="delta ${i.delta.tono}"><span aria-hidden="true">${i.delta.flecha}</span>${esc(i.delta.texto)}</div>` : '';
    return `<article class="kpi ${i.estado}"><div class="kpi-hd"><span class="kpi-nom"><span aria-hidden="true">${i.icono}</span>${esc(i.nombre)}</span></div>`
      + `<div class="kpi-val${String(i.texto).length > 10 ? ' largo' : ''}">${esc(i.texto)}${i.unidad && i.unidad !== 'pts' ? `<small>${esc(i.unidad)}</small>` : ''}</div>`
      + `<div>${chip(i.estado)}</div>`
      + (i.meta ? `<div class="kpi-meta">${esc(i.meta)}</div>` : '')
      + `<div class="kpi-sub">${esc(i.sub)}</div>${delta}`
      + `<div class="kpi-ex" id="ex-${i.id}">${esc(i.explica)}</div>`
      + `<div class="kpi-ac"><button type="button" class="lnk info-btn" aria-expanded="false" aria-controls="ex-${i.id}">ⓘ ¿Qué es?</button><button type="button" class="lnk" data-go="${i.tab}">Ver detalle →</button></div></article>`;
  }).join('');

  const lista = (arr, vacio) => arr.length ? '<ul>' + arr.map(t => `<li>${esc(t)}</li>`).join('') + '</ul>' : `<p class="vacio">${esc(vacio)}</p>`;
  const trio = `<div class="trio"><section class="col"><h3><span aria-hidden="true">✔</span> Va bien</h3>${lista(msgs.bien, 'Este mes no hay logros que destacar.')}</section>`
    + `<section class="col vig"><h3><span aria-hidden="true">!</span> Hay que vigilar</h3>${lista(msgs.vigilar, 'Nada preocupante este mes.')}</section>`
    + `<section class="col sig"><h3><span aria-hidden="true">→</span> Lo que sigue</h3>${lista(msgs.sigue, '')}</section></div>`;

  const filasMeta = [];
  if (moduloActivo(active, 'seleccion') && m.hayRq) filasMeta.push({ nombre: 'Efectividad de selección', valor: m.pctSel, texto: fmtNum(m.pctSel) + ' %', ok: METAS.seleccion.ok, warn: METAS.seleccion.warn, masEsMejor: true, max: 100, tabId: 'sel' });
  if (moduloActivo(active, 'rotacion') && !m.sdHc) filasMeta.push({ nombre: 'Rotación', valor: m.tasaRot, texto: fmtDec(m.tasaRot) + ' %', ok: METAS.rotacion.ok, warn: METAS.rotacion.warn, masEsMejor: false, max: 10, tabId: 'rot' });
  if (moduloActivo(active, 'ausentismo')) filasMeta.push({ nombre: 'Ausentismo', valor: m.ausTasa, texto: fmtDec(m.ausTasa) + ' %', ok: METAS.ausentismo.ok, warn: METAS.ausentismo.warn, masEsMejor: false, max: 8, tabId: 'aus' });
  if (moduloActivo(active, 'sst_tasa') && m.hayTasa) filasMeta.push({ nombre: 'Tasa de accidentalidad', valor: m.tasaAT, texto: fmtDec(m.tasaAT) + ' %', ok: METAS.tasaAT.ok, warn: METAS.tasaAT.warn, masEsMejor: false, max: 5, tabId: 'sst' });
  if (moduloActivo(active, 'sst_investigacion') && m.invTotal > 0) filasMeta.push({ nombre: 'Investigación de accidentes', valor: m.invPct, texto: fmtNum(Math.round(m.invPct)) + ' %', ok: METAS.investigacion.ok, warn: METAS.investigacion.warn, masEsMejor: true, max: 100, tabId: 'sst' });
  if (moduloActivo(active, 'clima') && !m.sdClima) filasMeta.push({ nombre: 'Satisfacción del personal', valor: m.satisfaccion, texto: fmtNum(m.satisfaccion) + ' %', ok: METAS.satisfaccion.ok, warn: METAS.satisfaccion.warn, masEsMejor: true, max: 100, tabId: 'clima' });
  const metas = filasMeta.length ? card('¿Dónde estamos frente a la meta?', panelMetas(filasMeta)
    + `<div class="metas-ley"><span><i style="background:${COLOR.ok}"></i>Zona de meta</span><span><i style="background:${COLOR.warn}"></i>Para vigilar</span><span><i style="background:${COLOR.bad}"></i>Zona crítica</span><span>● El círculo marca dónde está hoy</span></div>`,
  { sub: 'Cada barra va de lo mejor a lo peor. Toca una fila para ver su detalle.' }) : '';

  const comp = ind.filter(i => i.prev != null && Number.isFinite(i.prev));
  const fmtV = (i, v) => (i.unidad === 'pts' ? fmtDec(v).replace(/,0$/, '') + ' %' : fmtNum(v));
  const comparativo = prev
    ? (comp.length ? card(`Comparativo con ${mesPrev}`, comparar(comp.map(i => ({ nombre: i.nombre, antes: i.prev, ahora: i.valor, txtAntes: fmtV(i, i.prev), txtAhora: fmtV(i, i.valor) })))
      + `<div class="cmp-ley"><span><i style="background:#B8C4BC"></i>${esc(mesPrev)}</span><span><i style="background:var(--vd)"></i>${esc(c.mes)}</span></div>`, { sub: 'La barra gris es el mes anterior y la verde es este mes. Cada fila tiene su propia escala.' }) : '')
    : card('Comparativo con el mes anterior', '<p class="vacio">Este es el primer informe de este cliente en la plataforma. Desde el próximo mes verás aquí cómo cambió cada indicador.</p>');

  const leer = card('Cómo leer este informe', `<div class="leer"><div class="paso"><b><span class="num">1</span>Mira el semáforo</b>Cada indicador tiene un estado con color y símbolo, para que se entienda también sin ver los colores.</div>`
    + `<div class="paso"><b><span class="num">2</span>Compáralo con la meta</b>Debajo de cada cifra está la meta. La flecha indica si mejoró o empeoró frente al mes anterior.</div>`
    + `<div class="paso"><b><span class="num">3</span>Entra al detalle</b>Toca “Ver detalle” o usa las pestañas de arriba. Cada sección explica qué mide y cómo se calcula.</div></div>`
    + `<div class="claves">${chip('ok')}${chip('warn')}${chip('bad')}${chip('info')}</div>`);

  const gl = glosarioDe(active);
  const glosario = gl.length ? `<details class="expl"><summary>📖 Glosario: las palabras de este informe</summary><dl class="expl-b gloss">${gl.map(g => `<div><dt>${esc(g.t)}</dt><dd>${esc(g.d)}</dd></div>`).join('')}</dl></details>` : '';

  return `<div id="t-res" class="tab on" role="tabpanel">`
    + `<section class="titular ${tono}"><div><div class="kk">Así cerró ${esc(c.mes)}</div><h2>${esc(titular)}</h2><p>${esc(sub)}</p></div>${evaluados && !m.vacio ? `<div class="semaforos">${sem('ok', 'En meta')}${sem('warn', 'Vigilar')}${sem('bad', 'Atención')}</div>` : ''}</section>`
    + (ind.length ? `<div class="kpis">${tarjetas}</div>` : card('Sin módulos activos', '<p class="vacio">Este informe no tiene secciones activas.</p>'))
    + trio + metas + comparativo + leer + glosario + '</div>';
}

/* ───────────────────────── Armado ───────────────────────── */

const SECCIONES = [
  { id: 'sel', mod: 'seleccion', label: 'Selección', ic: '🎯', fn: secSeleccion },
  { id: 'hc', mod: 'headcount', label: 'Personal', ic: '👥', fn: secHeadcount },
  { id: 'rot', mod: 'rotacion', label: 'Rotación', ic: '🔄', fn: secRotacion },
  { id: 'sst', mod: 'sst', mods: ['sst', 'sst_tasa', 'sst_severidad', 'sst_investigacion'], label: 'Seguridad y salud', ic: '🛡️', fn: secSST },
  { id: 'nom', mod: 'nomina', label: 'Nómina', ic: '💰', fn: secNomina },
  { id: 'aus', mod: 'ausentismo', label: 'Ausentismo', ic: '⏰', fn: secAusentismo },
  { id: 'cap', mod: 'capacitacion', label: 'Formación', ic: '🎓', fn: secCapacitacion },
  { id: 'clima', mod: 'clima', label: 'Clima', ic: '😊', fn: secClima },
  { id: 'fac', mod: 'facturacion', label: 'Facturación', ic: '🧾', fn: secFacturacion },
  { id: 'act', mod: 'fotos', label: 'Actividades', ic: '📷', fn: secFotos },
];

/**
 * Devuelve el HTML completo del informe.
 * `extras`: { ausentismo, capacitacion, clima, facturacion, activeModules, previo }
 * `extras.previo` (opcional) = { d, rqs, motivos, casos, extras, activeModules } del mes anterior del mismo cliente.
 */
export function buildInformeHTML(d, rqs, motivos, casos, fotos, extras = {}) {
  const active = Array.isArray(extras?.activeModules) ? extras.activeModules : null;
  const ex = extras || {};
  const m = calcularMetricas(d, rqs, motivos, casos, ex);

  let prev = null;
  let prevActive = null;
  if (ex.previo?.d) {
    prev = calcularMetricas(ex.previo.d, ex.previo.rqs, ex.previo.motivos, ex.previo.casos, ex.previo.extras || {});
    prevActive = Array.isArray(ex.previo.activeModules) ? ex.previo.activeModules : null;
  }
  const ind = construirIndicadores(m, active, prev);
  // Un módulo que el mes anterior no se reportaba no se compara (sería comparar con ceros inventados).
  ind.forEach(i => { if (prev && !moduloActivo(prevActive, i.id)) { i.prev = null; delete i.delta; } });
  const msgs = construirMensajes(m, ind, active, ex, prev);

  const mes = nombrePeriodo(d.per);
  const cli = d.cliNom + (d.cliMarca ? ' · ' + d.cliMarca : '');
  const ctx = { d, m, prev, ind, msgs, rqs, motivos, casos, fotos, extras: ex, active, mes, cli };

  const secs = SECCIONES.filter(s => (s.mods || [s.mod]).some(id => moduloActivo(active, id)));
  const nav = `<nav class="nav" aria-label="Secciones del informe"><div class="nav-in" role="tablist">`
    + [{ id: 'res', label: 'Resumen', ic: '📋' }, ...secs].map((s, i) => `<button type="button" class="nb" role="tab" id="tb-${s.id}" data-tab="${s.id}" aria-selected="${i === 0}" aria-controls="t-${s.id}" tabindex="${i === 0 ? 0 : -1}"><span class="ic" aria-hidden="true">${s.ic}</span>${esc(s.label)}</button>`).join('')
    + '</div></nav>';

  const logoCli = d.logoCli
    ? `<div class="cli-logo"><img src="${esc(d.logoCli)}" alt="${esc(d.cliNom)}" onerror="this.parentNode.style.display='none'"></div>` : '';
  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  const hero = `<header class="hero"><div class="hero-in"><div class="hero-top"><div class="hero-logos"><img class="hero-logo" src="${logoDataUri({ onDark: true })}" alt="Proservis"><span class="hero-sep"></span>${logoCli}<span class="cli-nom">${esc(cli)}</span></div>`
    + `<button type="button" class="btn-print" aria-label="Imprimir o guardar como PDF">🖨 Imprimir / PDF</button></div>`
    + `<div class="hero-tit"><div class="hero-kicker">Indicadores de gestión</div><h1>Informe de ${esc(mes)}</h1><p>Un resumen claro de cómo va el servicio de personal en ${esc(String(d.cliNom).replace(/[.\s]+$/, ''))}.</p>${hay(d.ejNom) ? `<p class="ej">Tu ejecutivo de cuenta: ${esc(d.ejNom)}</p>` : ''}</div></div></header>`;

  const pie = `<footer class="pie"><div class="pie-in"><img src="${logoDataUri({ onDark: true })}" alt="Proservis"><p>Informe de <strong>${esc(cli)}</strong> · ${esc(mes)} · Confidencial</p><p>Conectamos personas con una mejor calidad de vida · Generado el ${esc(hoy)}</p></div></footer>`;

  return '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + `<title>Informe ${esc(d.cliNom)} · ${esc(mes)}</title>\n<style>\n${REPORT_CSS}\n</style>\n</head>\n<body style="margin:0">\n`
    + `<div class="rpt${ex.compacto ? ' rpt-compacto' : ''}" id="rpt">${hero}${nav}<main class="main">${secResumen(ctx)}${secs.map(s => s.fn(ctx)).join('')}</main>${pie}<div class="zoom" role="dialog" aria-label="Foto ampliada"><img alt=""></div></div>\n`
    + `<script>\n${REPORT_JS}\n</script>\n</body>\n</html>`;
}
