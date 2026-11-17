/**
 * services/reportCharts.js
 * ─────────────────────────────────────────────────────────────────────────
 * Gráficas del reporte HTML. Devuelven texto (SVG o HTML) sin dependencias, y
 * todas llevan `data-tip="…"`: el script del reporte muestra ese texto al pasar
 * el mouse, al enfocar con el teclado o al tocar en el celular.
 *
 * Reglas de estas gráficas:
 *  - Cada número se explica solo (etiqueta + valor + % en el tooltip).
 *  - Las metas se ven dibujadas (marca "Meta"), no solo escritas.
 *  - Los colores siempre llevan además un texto o un símbolo, para quien no los distingue.
 *  - Todo texto dinámico pasa por `esc()`.
 */
import { fmtNum, fmtDec } from '../utils/format.js';

export const COLOR = { ok: '#168A43', warn: '#E8BB26', bad: '#C0392B', info: '#2196F3', neutro: '#9AA6A0', osc: '#12212D' };
const PALETA = ['#168A43', '#2196F3', '#E8BB26', '#C0392B', '#7B68EE', '#00BFA5', '#FF6F00', '#607D8B', '#9C27B0', '#0097A7'];

export function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const tip = (t) => `data-tip="${esc(t)}" tabindex="0"`;
const FONT = 'font-family="Segoe UI,system-ui,Arial,sans-serif"';

function polar(cx, cy, r, grados) {
  const a = grados * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arco(cx, cy, r, g0, g1, grosor) {
  const [x0, y0] = polar(cx, cy, r, g0); const [x1, y1] = polar(cx, cy, r, g1);
  const [x2, y2] = polar(cx, cy, r - grosor, g1); const [x3, y3] = polar(cx, cy, r - grosor, g0);
  const grande = Math.abs(g1 - g0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${grande} 1 ${x1} ${y1} L ${x2} ${y2} A ${r - grosor} ${r - grosor} 0 ${grande} 0 ${x3} ${y3} Z`;
}

/**
 * Medidor de media luna con zonas verde / ámbar / roja y una aguja.
 * `masEsMejor`: true si un valor alto es bueno (selección), false si uno bajo lo es (ausentismo).
 */
export function gauge(valor, { max = 100, ok, warn, masEsMejor = true, sufijo = ' %', etiqueta = '', decimales = 0 } = {}) {
  const W = 220; const H = 150; const cx = 110; const cy = 112; const r = 92; const g = 20;
  const v = Math.max(0, Math.min(Number(valor) || 0, max));
  const aGrados = (x) => 180 + (Math.max(0, Math.min(x, max)) / max) * 180;
  const zonas = masEsMejor
    ? [[0, warn, COLOR.bad], [warn, ok, COLOR.warn], [ok, max, COLOR.ok]]
    : [[0, ok, COLOR.ok], [ok, warn, COLOR.warn], [warn, max, COLOR.bad]];
  const arcos = zonas.filter(z => z[1] > z[0]).map(z => `<path d="${arco(cx, cy, r, aGrados(z[0]), aGrados(z[1]), g)}" fill="${z[2]}" opacity=".9"/>`).join('');
  const [nx, ny] = polar(cx, cy, r - g - 6, aGrados(v));
  const txt = (decimales ? fmtDec(valor) : fmtNum(valor)) + sufijo;
  const meta = masEsMejor ? ok : ok;
  const [mx0, my0] = polar(cx, cy, r + 2, aGrados(meta)); const [mx1, my1] = polar(cx, cy, r - g - 2, aGrados(meta));
  const [lx, ly] = polar(cx, cy, r + 14, aGrados(meta));
  return `<svg class="cht gauge" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(etiqueta)}: ${esc(txt)}" ${tip(`${etiqueta}: ${txt}. Meta: ${masEsMejor ? 'desde' : 'hasta'} ${fmtNum(ok)}${sufijo.trim() ? ' ' + sufijo.trim() : ''}.`)}>
    ${arcos}
    <line x1="${mx0}" y1="${my0}" x2="${mx1}" y2="${my1}" stroke="${COLOR.osc}" stroke-width="2" stroke-dasharray="3 2"/>
    <text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" font-weight="700" fill="${COLOR.osc}" ${FONT}>Meta</text>
    <line class="needle" x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${COLOR.osc}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="6" fill="${COLOR.osc}"/>
    <text x="${cx}" y="${cy + 33}" text-anchor="middle" font-size="24" font-weight="800" fill="${COLOR.osc}" ${FONT}>${esc(txt)}</text>
  </svg>`;
}

/** Dona con un texto al centro. `items`: [{label, value, color?}] */
export function donut(items, { size = 180, grosor = 30, centro = '', sub = '', total: tot } = {}) {
  const total = tot ?? (items.reduce((s, i) => s + (Number(i.value) || 0), 0) || 1);
  const cx = size / 2; const r = size / 2 - 4;
  let ang = -90; let paths = '';
  items.forEach((it, i) => {
    const val = Number(it.value) || 0;
    if (val <= 0) return;
    const pct = val / total; const col = it.color || PALETA[i % PALETA.length];
    const t = `${it.label}: ${fmtNum(val)} (${fmtNum(Math.round(pct * 100))} %)`;
    if (pct >= 0.999) paths += `<circle class="seg" cx="${cx}" cy="${cx}" r="${r - grosor / 2}" fill="none" stroke="${col}" stroke-width="${grosor}" ${tip(t)}/>`;
    else { paths += `<path class="seg" d="${arco(cx, cx, r, ang, ang + pct * 360, grosor)}" fill="${col}" ${tip(t)}/>`; }
    ang += pct * 360;
  });
  return `<svg class="cht donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(centro)} ${esc(sub)}">
    ${paths}
    ${centro ? `<text x="${cx}" y="${cx + 2}" text-anchor="middle" font-size="26" font-weight="800" fill="${COLOR.osc}" ${FONT}>${esc(centro)}</text>` : ''}
    ${sub ? `<text x="${cx}" y="${cx + 20}" text-anchor="middle" font-size="11" font-weight="700" fill="#4A5A4A" ${FONT}>${esc(sub)}</text>` : ''}
  </svg>`;
}

/** Leyenda de la dona: cuadro de color + etiqueta + cantidad y porcentaje. */
export function leyenda(items) {
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0) || 1;
  return '<ul class="leyenda">' + items.filter(i => Number(i.value) > 0).map((it, i) => {
    const col = it.color || PALETA[i % PALETA.length];
    return `<li><span class="sw" style="background:${col}"></span><span class="lt">${esc(it.label)}</span><strong>${fmtNum(it.value)}</strong><span class="lp">${fmtNum(Math.round(it.value / total * 100))} %</span></li>`;
  }).join('') + '</ul>';
}

/**
 * Barras horizontales en HTML (el nombre se parte en varias líneas si es largo; no se corta).
 * `meta` dibuja una marca vertical en ese valor. items: [{label, value, color?, nota?}]
 */
export function barras(items, { max, meta, sufijo = '', metaTexto = 'Meta', fmt = fmtNum } = {}) {
  const tope = max ?? Math.max(...items.map(i => Number(i.value) || 0), meta || 0, 1);
  const pos = (v) => Math.max(0, Math.min(100, (Number(v) || 0) / tope * 100));
  return '<div class="barras">' + items.map((it, i) => {
    const col = it.color || PALETA[i % PALETA.length];
    const t = `${it.label}: ${fmt(it.value)}${sufijo}${it.nota ? ' · ' + it.nota : ''}`;
    return `<div class="barra" ${tip(t)}><div class="b-lab">${esc(it.label)}</div><div class="b-pista"><div class="b-rel" style="width:${pos(it.value)}%;background:${col}"></div>${meta != null ? `<div class="b-meta" style="left:${pos(meta)}%" title="${esc(metaTexto)}"><span>${esc(metaTexto)}</span></div>` : ''}</div><div class="b-val">${fmt(it.value)}${esc(sufijo)}</div></div>`;
  }).join('') + '</div>';
}

/** Cascada del movimiento de personal: inicio, + ingresos, − retiros, = cierre. */
export function cascada({ inicio, ingresos, retiros, cierre }) {
  const W = 520; const H = 250; const padL = 14; const padR = 14; const padT = 30; const padB = 46;
  const bruto = inicio + ingresos;
  const tope = Math.max(inicio, bruto, cierre, 1) * 1.12;
  const alto = H - padT - padB;
  const y = (v) => padT + alto - (v / tope) * alto;
  const bw = 78; const gap = (W - padL - padR - bw * 4) / 3;
  const barras4 = [
    { x: 0, de: 0, a: inicio, col: '#5A6A5A', et: 'Al inicio', val: fmtNum(inicio), t: `Al inicio del mes había ${fmtNum(inicio)} personas activas.` },
    { x: 1, de: inicio, a: bruto, col: COLOR.ok, et: 'Ingresos', val: '+' + fmtNum(ingresos), t: `Ingresaron ${fmtNum(ingresos)} personas.` },
    { x: 2, de: cierre, a: bruto, col: COLOR.bad, et: 'Retiros', val: '−' + fmtNum(retiros), t: `Se retiraron ${fmtNum(retiros)} personas.` },
    { x: 3, de: 0, a: cierre, col: COLOR.warn, et: 'Al cierre', val: fmtNum(cierre), t: `Al cierre del mes quedaron ${fmtNum(cierre)} personas activas.` },
  ];
  let s = '';
  barras4.forEach((b, i) => {
    const x = padL + b.x * (bw + gap);
    const yTop = y(Math.max(b.de, b.a)); const h = Math.max(2, Math.abs(y(b.de) - y(b.a)));
    s += `<rect class="vb" x="${x}" y="${yTop}" width="${bw}" height="${h}" rx="6" fill="${b.col}" ${tip(b.t)} style="animation-delay:${i * 90}ms"/>`;
    s += `<text x="${x + bw / 2}" y="${yTop - 8}" text-anchor="middle" font-size="14" font-weight="800" fill="${COLOR.osc}" ${FONT}>${esc(b.val)}</text>`;
    s += `<text x="${x + bw / 2}" y="${H - 22}" text-anchor="middle" font-size="12" font-weight="700" fill="#4A5A4A" ${FONT}>${esc(b.et)}</text>`;
    if (i < 3) { const nx = x + bw + gap; s += `<line x1="${x + bw}" y1="${y(i === 0 ? inicio : i === 1 ? bruto : cierre)}" x2="${nx}" y2="${y(i === 0 ? inicio : i === 1 ? bruto : cierre)}" stroke="#B8C4BC" stroke-dasharray="3 3"/>`; }
  });
  return `<svg class="cht" viewBox="0 0 ${W} ${H}" role="img" aria-label="Movimiento de personal: inicio ${inicio}, ingresos ${ingresos}, retiros ${retiros}, cierre ${cierre}">
    <line x1="${padL}" y1="${y(0)}" x2="${W - padR}" y2="${y(0)}" stroke="#C9D3CC"/>${s}</svg>`;
}

/**
 * Panel de metas: una fila por indicador con una pista de tres zonas (verde, ámbar, roja)
 * y un punto donde está hoy. rows: [{nombre, valor, texto, ok, warn, masEsMejor, max, tabId}]
 */
export function panelMetas(rows) {
  return '<div class="metas">' + rows.map(r => {
    const max = r.max;
    const p = (x) => Math.max(0, Math.min(100, x / max * 100));
    const zonas = r.masEsMejor
      ? [[0, r.warn, COLOR.bad], [r.warn, r.ok, COLOR.warn], [r.ok, max, COLOR.ok]]
      : [[0, r.ok, COLOR.ok], [r.ok, r.warn, COLOR.warn], [r.warn, max, COLOR.bad]];
    const bandas = zonas.map(z => `<span class="zona" style="left:${p(z[0])}%;width:${p(z[1]) - p(z[0])}%;background:${z[2]}"></span>`).join('');
    const t = `${r.nombre}: ${r.texto}. ${r.masEsMejor ? 'Meta: ' + fmtNum(r.ok) + ' o más' : 'Meta: hasta ' + fmtNum(r.ok)}.`;
    return `<button type="button" class="meta-fila" data-go="${esc(r.tabId)}" ${tip(t)}><span class="m-nom">${esc(r.nombre)}</span><span class="m-pista">${bandas}<span class="punto" style="left:${p(r.valor)}%"></span></span><span class="m-val">${esc(r.texto)}</span></button>`;
  }).join('') + '</div>';
}

/**
 * Mes anterior contra este mes: dos barras finas por fila. Cada fila se escala sola
 * (así se pueden comparar cosas en unidades distintas: %, personas, accidentes).
 * items: [{nombre, antes, ahora, txtAntes?, txtAhora?}]
 */
export function comparar(items) {
  return '<div class="cmp">' + items.map(i => {
    const tope = Math.max(Number(i.antes) || 0, Number(i.ahora) || 0, 1);
    const ta = i.txtAntes ?? fmtNum(i.antes); const th = i.txtAhora ?? fmtNum(i.ahora);
    return `<div class="cmp-fila" ${tip(`${i.nombre}: antes ${ta}, ahora ${th}`)}><span class="c-nom">${esc(i.nombre)}</span><span class="c-barras"><span class="c-b antes" style="width:${(Number(i.antes) || 0) / tope * 100}%"></span><span class="c-b ahora" style="width:${(Number(i.ahora) || 0) / tope * 100}%"></span></span><span class="c-val">${esc(ta)} → <strong>${esc(th)}</strong></span></div>`;
  }).join('') + '</div>';
}
