/**
 * services/pptxReport.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Genera un .pptx 100% fiel a la PLANTILLA OPERACIONES - INFORME DE GESTION
 * 18 slides con datos reales + gráficas nativas de pptxgenjs.
 * Usa datos del mismo `buildInformePreviewHtml` (selección, rotación, SST, etc.)
 */
import { MESES_LARGOS } from '../utils/format';

const VD = '168A43';
const AM = 'E8BB26';
const OSC = '12212D';
const RO = 'C0392B';

function addHeader(slide, mesStr, cliNom) {
  slide.background = { color: 'FFFFFF' };
  // franja superior verde
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.85, fill: { color: VD } });
  slide.addText('Indicadores de Gestión', { x: 0.5, y: 0.15, w: 9, h: 0.3, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center' });
  slide.addText(`Conectamos personas con una mejor calidad de vida  •  ${mesStr}  •  ${cliNom}`, { x: 0.5, y: 0.45, w: 9, h: 0.2, fontSize: 9, color: 'FFFFFF', align: 'center' });
  // footer
  slide.addShape('rect', { x: 0, y: 7.1, w: '100%', h: 0.4, fill: { color: OSC } });
  slide.addText(`Informe confidencial • ${cliNom} • ${mesStr} • Proservis Temporales`, { x: 0.3, y: 7.15, w: 8, h: 0.3, fontSize: 9, color: 'FFFFFF' });
}

function addSectionTitle(slide, title, subtitle) {
  slide.addShape('rect', { x: 0.4, y: 1.0, w: 9.2, h: 0.9, fill: { color: VD }, rectRadius: 0.15 });
  slide.addText(title, { x: 0.6, y: 1.15, w: 8.8, h: 0.35, fontSize: 18, bold: true, color: 'FFFFFF' });
  if (subtitle) slide.addText(subtitle, { x: 0.6, y: 1.5, w: 8.8, h: 0.2, fontSize: 9, color: 'FFFFFF' });
}

/** es-CO: separador de miles con punto y decimales con coma ('3.5%' → '3,5%'). */
function fmtKpi(v) {
  if (typeof v === 'number') return v.toLocaleString('es-CO');
  const t = String(v);
  return /^-?\d+\.\d+%?$/.test(t) ? t.replace('.', ',') : t;
}

function addKPIs(slide, kpis, y = 2.2) {
  const w = 2.15, gap = 0.2;
  kpis.forEach((k, i) => {
    const x = 0.4 + i * (w + gap);
    const txtCol = k.sem === 'bad' || k.sem === 'warn' ? 'FFFFFF' : VD;
    slide.addShape('roundRect', { x, y, w, h: 0.95, fill: { color: 'FFFFFF' }, line: { color: k.sem === 'bad' ? RO : k.sem === 'warn' ? AM : VD, width: 1.2 }, rectRadius: 0.12 });
    slide.addText(k.label, { x, y: y + 0.08, w, h: 0.18, fontSize: 9, bold: true, color: '62748A', align: 'center' });
    slide.addText(fmtKpi(k.value), { x, y: y + 0.28, w, h: 0.32, fontSize: 16, bold: true, color: txtCol, align: 'center' });
    if (k.sub) slide.addText(k.sub, { x, y: y + 0.62, w, h: 0.18, fontSize: 9, color: '62748A', align: 'center' });
  });
}

export async function generateInformePPTX(state) {
  const { default: PptxGenJS } = await import('pptxgenjs'); // se descarga solo al exportar
  const { periodo, ejecutivo, headcount, sst, nomina, seleccion, rotacion, fotos, ausentismo, capacitacion, clima, facturacion, activeModules, cliNomOverride, cliMarcaOverride } = state;
  const cliNom = cliNomOverride || state.cliNom || 'Cliente';
  const cliMarca = cliMarcaOverride || state.cliMarca || '';
  const pts = (periodo || '2026-09').split('-');
  const mesStr = `${MESES_LARGOS[+pts[1] - 1]} ${pts[0]}`;
  const hcCierre = (headcount?.inicio || 0) + (headcount?.ingresos || 0) - (headcount?.retiros || 0);
  const rqSol = (seleccion || []).reduce((a, r) => a + (+r.solicitadas || 0), 0);
  const rqCon = (seleccion || []).reduce((a, r) => a + (+r.contratadas || 0), 0);
  const pctSel = rqSol ? Math.round(rqCon / rqSol * 100) : 0;
  const totMot = (rotacion || []).reduce((a, r) => a + (+r.cantidad || 0), 0);
  const tasaRot = hcCierre ? Math.round(totMot / hcCierre * 1000) / 10 : 0;

  const on = (id) => !Array.isArray(activeModules) || activeModules.includes(id);
  const hayFotos = !!fotos && Object.values(fotos).some(Boolean);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Proservis Temporales';
  pptx.title = `Informe Gestion ${cliNom} ${mesStr}`;
  pptx.subject = 'Indicadores de Gestión';

  // ── SLIDE 1: PORTADA ──
  {
    const s = pptx.addSlide();
    s.background = { color: VD };
    s.addShape('triangle', { x: 0, y: 0, w: 1.2, h: 1.2, fill: { color: AM } });
    s.addText('Indicadores de', { x: 0.8, y: 1.5, w: 8.5, h: 0.5, fontSize: 22, color: 'FFFFFF' });
    s.addText('GESTIÓN', { x: 0.8, y: 2.0, w: 8.5, h: 0.7, fontSize: 38, bold: true, color: 'FFFFFF' });
    s.addShape('rect', { x: 0.8, y: 3.0, w: 2.2, h: 0.06, fill: { color: AM } });
    s.addText(mesStr, { x: 0.8, y: 3.3, w: 4, h: 0.4, fontSize: 16, bold: true, color: AM });
    s.addText(`${cliNom}${cliMarca ? ' · ' + cliMarca : ''}`, { x: 0.8, y: 3.75, w: 6, h: 0.3, fontSize: 11, color: 'FFFFFF' });
    s.addText(`Ejecutivo: ${ejecutivo?.nom || ''}`, { x: 0.8, y: 4.1, w: 6, h: 0.25, fontSize: 9, color: 'E8F5EE' });
    s.addShape('roundRect', { x: 7.8, y: 2.0, w: 2.7, h: 1.35, fill: { color: 'FFFFFF' }, rectRadius: 0.15 });
    s.addText(cliNom, { x: 7.9, y: 2.4, w: 2.5, h: 0.5, fontSize: 11, bold: true, color: OSC, align: 'center' });
    s.addText('Conectamos personas con una mejor calidad de vida', { x: 0.8, y: 6.8, w: 8, h: 0.25, fontSize: 10, italic: true, color: 'FFFFFF' });
  }

  // ── SLIDE 2: INDICADORES SELECCIÓN Y CONTRATACIÓN (sección) ──
  if (on('seleccion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'Indicadores Selección y Contratación', mesStr + ' · ' + cliNom);
    addKPIs(s, [
      { label: 'Solicitadas', value: rqSol, sub: 'Total RQs' },
      { label: 'Contratadas', value: rqCon, sub: pctSel + '% efectividad', sem: pctSel >= 80 ? 'ok' : pctSel >= 50 ? 'warn' : 'bad' },
      { label: 'Pendientes', value: rqSol - rqCon, sem: rqSol - rqCon > 0 ? 'bad' : 'ok' },
      { label: 'Efectividad', value: pctSel + '%', sem: pctSel >= 80 ? 'ok' : pctSel >= 50 ? 'warn' : 'bad' },
    ], 2.2);
    // donut efectividad
    s.addChart('doughnut', [
      { name: 'Efectividad', labels: ['Contratadas', 'Pendientes'], values: [rqCon, Math.max(0, rqSol - rqCon)] },
    ], { x: 1.2, y: 3.5, w: 3.2, h: 3.2, doughnutHoleSize: 58, chartColors: [VD, 'E8EAE8'], showLegend: true, legendPos: 'b', dataLabelPosition: 'bestFit', showValue: true });
    // barras por RQ top 6
    const top = (seleccion || []).slice(0, 6);
    if (top.length) {
      s.addChart('bar', [
        { name: '% Cumplimiento', labels: top.map(r => (r.rq || r.cargo || 'RQ').slice(0, 12)), values: top.map(r => r.solicitadas ? Math.round(r.contratadas / r.solicitadas * 100) : 0) },
      ], { x: 5.2, y: 3.5, w: 4.3, h: 3.2, barDir: 'col', showValue: true, chartColors: [VD], valAxisMaxVal: 100, catAxisTitle: 'RQ', valAxisTitle: '%', showLegend: false });
    }
    s.addText('Fuente: Selección y Contratación', { x: 0.4, y: 6.85, w: 9, h: 0.2, fontSize: 9, color: '5A6A5A' });
  }

  // ── SLIDE 3: OPORTUNIDAD ──
  if (on('seleccion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'OPORTUNIDAD', 'Tiempo de cobertura · Días promedio por vacante');
    const avgDias = (seleccion || []).length ? Math.round((seleccion || []).reduce((a, r) => a + (+r.diasCobertura || 0), 0) / (seleccion || []).length) || 0 : 0;
    addKPIs(s, [
      { label: 'Promedio días', value: avgDias || '—', sub: avgDias ? 'por vacante' : 'Sin dato días' },
      { label: 'Solicitadas', value: rqSol },
      { label: 'Contratadas', value: rqCon },
      { label: 'Pendientes', value: rqSol - rqCon, sem: 'warn' },
    ], 2.2);
    if ((seleccion || []).some(r => r.diasCobertura)) {
      const labels = (seleccion || []).slice(0, 6).map(r => String(r.rq || r.cargo || 'RQ').slice(0, 10));
      const vals = (seleccion || []).slice(0, 6).map(r => +r.diasCobertura || 0);
      s.addChart('bar', [{ name: 'Días', labels, values: vals }], { x: 0.8, y: 3.5, w: 8.5, h: 3.0, barDir: 'col', showValue: true, chartColors: [AM], showLegend: false });
    } else {
      s.addText('Registre "días de cobertura" por RQ en el Excel (columna Días/Oportunidad) para ver la gráfica aquí.', { x: 1, y: 4, w: 8, h: 1, fontSize: 10, color: '5A6A5A', align: 'center' });
      s.addShape('rect', { x: 1, y: 5, w: 8, h: 0.08, fill: { color: AM } });
    }
  }

  // ── SLIDE 4: EFECTIVIDAD ──
  if (on('seleccion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'EFECTIVIDAD', 'Cantidad de vacantes cubiertas frente a las solicitadas');
    addKPIs(s, [
      { label: 'Efectividad', value: pctSel + '%', sub: `${rqCon} / ${rqSol}`, sem: pctSel >= 80 ? 'ok' : pctSel >= 50 ? 'warn' : 'bad' },
      { label: 'Meta', value: '80%', sub: pctSel >= 80 ? 'Cumplida' : 'Por debajo' },
    ], 2.2);
    s.addChart('doughnut', [{ name: 'Efectividad', labels: ['Cubiertas', 'No cubiertas'], values: [rqCon, Math.max(0, rqSol - rqCon)] }], { x: 2.5, y: 3.4, w: 3.8, h: 3.4, doughnutHoleSize: 62, chartColors: [pctSel >= 80 ? VD : pctSel >= 50 ? AM : RO, 'E8EAE8'], showLegend: true, legendPos: 'b', showValue: true, showPercent: true });
    // tabla mini
    const rows = [['RQ', 'Solicit.', 'Contrat.', '%']];
    (seleccion || []).slice(0, 5).forEach(r => {
      const pct = r.solicitadas ? Math.round(r.contratadas / r.solicitadas * 100) + '%' : '—';
      rows.push([r.rq || '—', String(r.solicitadas || 0), String(r.contratadas || 0), pct]);
    });
    if (rows.length > 1) s.addTable(rows, { x: 6.8, y: 3.5, w: 3.0, fontSize: 9, color: '12212D', border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.28, colW: [0.8, 0.6, 0.6, 0.6] });
  }

  // ── SLIDE 5: VACANTES ACTIVAS ──
  if (on('seleccion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'VACANTES ACTIVAS', 'Pendientes por cubrir al cierre del mes');
    const pend = rqSol - rqCon;
    addKPIs(s, [
      { label: 'Vacantes activas', value: pend, sem: pend > 5 ? 'bad' : pend > 0 ? 'warn' : 'ok', sub: pend ? 'Por cubrir' : 'Al día' },
      { label: 'Total solicitadas', value: rqSol },
    ], 2.2);
    const pendientes = (seleccion || []).filter(r => (r.solicitadas || 0) > (r.contratadas || 0)).slice(0, 6);
    if (pendientes.length) {
      s.addChart('bar', [{ name: 'Pendientes', labels: pendientes.map(r => String(r.rq || r.cargo || 'RQ').slice(0, 10)), values: pendientes.map(r => (r.solicitadas || 0) - (r.contratadas || 0)) }], { x: 1, y: 3.6, w: 8, h: 3.0, barDir: 'bar', showValue: true, chartColors: [RO], showLegend: false });
    } else {
      s.addText(pend === 0 ? '¡Sin vacantes activas! Todas cubiertas ✓' : 'Sin detalle por RQ', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 14, bold: true, color: VD, align: 'center' });
    }
  }

  // ── SLIDE 6: ADMINISTRACIÓN DE PERSONAL (sección) ──
  if (on('headcount') || on('rotacion') || on('nomina')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'Administración de personal', mesStr);
    addKPIs(s, [
      { label: 'Inicio', value: headcount?.inicio || 0 },
      { label: 'Ingresos', value: headcount?.ingresos || 0, sem: 'ok' },
      { label: 'Retiros', value: headcount?.retiros || 0, sem: 'bad' },
      { label: 'Cierre', value: hcCierre, sub: (hcCierre - (headcount?.inicio || 0) >= 0 ? '+' : '') + (hcCierre - (headcount?.inicio || 0)) + ' neto' },
    ], 2.2);
    s.addChart('bar', [{ name: 'Headcount', labels: ['Inicio', 'Ingresos', 'Retiros', 'Cierre'], values: [headcount?.inicio || 0, headcount?.ingresos || 0, headcount?.retiros || 0, hcCierre] }], { x: 1, y: 3.5, w: 8, h: 3.0, barDir: 'col', showValue: true, chartColors: ['5A6A5A', VD, RO, AM] });
  }

  // ── SLIDE 7: ROTACIÓN ACTUAL ──
  if (on('rotacion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'ROTACIÓN ACTUAL', `Tasa ${tasaRot}% · ${totMot} retiros / ${hcCierre} activos`);
    addKPIs(s, [
      { label: 'Total retiros', value: totMot, sem: totMot > 5 ? 'bad' : 'ok' },
      { label: 'Tasa rotación', value: tasaRot + '%', sub: tasaRot <= 3 ? 'Saludable' : tasaRot <= 6 ? 'Atención' : 'Crítica', sem: tasaRot <= 3 ? 'ok' : tasaRot <= 6 ? 'warn' : 'bad' },
      { label: 'Retención', value: (100 - tasaRot).toFixed(1) + '%' },
    ], 2.2);
    if ((rotacion || []).length) {
      s.addChart('bar', [{ name: 'Retiros', labels: (rotacion || []).slice(0, 6).map(r => r.motivo.slice(0, 14)), values: (rotacion || []).slice(0, 6).map(r => +r.cantidad || 0) }], { x: 0.8, y: 3.6, w: 4.8, h: 3.0, barDir: 'bar', showValue: true, chartColors: [AM] });
      s.addChart('doughnut', [{ name: 'Rotación', labels: (rotacion || []).map(r => r.motivo.slice(0, 12)), values: (rotacion || []).map(r => +r.cantidad || 0) }], { x: 6.2, y: 3.4, w: 3.0, h: 3.0, doughnutHoleSize: 55, showLegend: true, legendPos: 'r', chartColors: [VD, '2196F3', AM, RO, '7B68EE', '607D8B'] });
    } else {
      s.addText('Sin retiros registrados este mes — excelente retención ✓', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 12, bold: true, color: VD, align: 'center' });
    }
  }

  // ── SLIDE 8: CAUSALES DE LA ROTACIÓN ──
  if (on('rotacion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'CAUSALES DE LA ROTACIÓN', 'Distribución por motivo');
    if ((rotacion || []).length) {
      s.addChart('bar', [{ name: 'Causales', labels: (rotacion || []).map(r => r.motivo.slice(0, 18)), values: (rotacion || []).map(r => +r.cantidad || 0) }], { x: 0.5, y: 2.3, w: 9, h: 4.5, barDir: 'bar', showValue: true, chartColors: [VD], dataLabelPosition: 'outEnd' });
    } else {
      s.addText('Sin causales — sin retiros', { x: 1, y: 4, w: 8, h: 0.5, fontSize: 12, color: '5A6A5A', align: 'center' });
    }
    // tabla detalle
    const rows = [['Motivo', 'Cant.', '%']];
    (rotacion || []).forEach(r => rows.push([r.motivo, String(r.cantidad), totMot ? Math.round(r.cantidad / totMot * 100) + '%' : '—']));
    if (rows.length > 1) s.addTable(rows, { x: 0.5, y: 2.3, w: 9, h: 4.5, fontSize: 0, color: 'FFFFFF' }); // invisible, chart dominates; kept for export consistency
  }

  // ── SLIDE 9: NOVEDADES DE NÓMINA ──
  if (on('nomina')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'NOVEDADES DE NÓMINA', 'Periodo ' + mesStr + ' — ESTA DIAPOSITIVA SE UTILIZA SOLO SI SE TIENEN NOVEDADES');
    addKPIs(s, [
      { label: 'Liquidados', value: nomina?.liquidados || 0 },
      { label: 'Incapacidades', value: nomina?.incapacidades || 0, sem: (nomina?.incapacidades || 0) > 0 ? 'warn' : 'ok' },
      { label: 'Licencias', value: nomina?.licencias || 0 },
      { label: 'Errores', value: nomina?.errores || 0, sem: (nomina?.errores || 0) > 0 ? 'bad' : 'ok' },
    ], 2.2);
    s.addTable([
      [{ text: 'Concepto', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Cantidad', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }],
      ['Total liquidados', String(nomina?.liquidados || 0)],
      ['Incapacidades', String(nomina?.incapacidades || 0)],
      ['Licencias', String(nomina?.licencias || 0)],
      ['H. extras diurnas', String(nomina?.heDiurnas || 0)],
      ['H. extras nocturnas', String(nomina?.heNocturnas || 0)],
      ['Errores', String(nomina?.errores || 0)],
    ], { x: 2, y: 3.5, w: 6, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.32, colW: [3, 3] });
    if (nomina?.observaciones) s.addText(nomina.observaciones, { x: 1, y: 6.2, w: 8, h: 0.5, fontSize: 10, color: '5A6A5A', align: 'center' });
  }

  // ── SLIDE 10: ACTIVIDADES DE BIENESTAR ──
  if (on('fotos') && hayFotos) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'REGISTRO FOTOGRÁFICO', mesStr);
    // Solo se dibujan las fotos que realmente se cargaron (hasta 9, en cuadrícula de 3 × 3)
    const cargadas = Object.keys(fotos).map(Number).filter(i => fotos[i]).sort((x, y) => x - y).slice(0, 9);
    cargadas.forEach((idx, pos) => {
      const col = pos % 3, row = Math.floor(pos / 3);
      const x = 0.7 + col * 3.05, y = 2.2 + row * 1.5;
      try { s.addImage({ data: fotos[idx], x, y, w: 2.85, h: 1.35 }); } catch { /* imagen inválida: se omite */ }
    });
  }

  // Datos de SST por módulo (con respaldo en el personal activo cuando no hay expuestos por sede)
  const sedesSst = (sst?.sedes || []).filter(x => String(x.sede || '').trim()).map(x => ({ sede: String(x.sede).trim(), at: +x.at || 0, expuestos: +x.expuestos || 0 }));
  const nacSst = sedesSst.find(x => x.sede.toLowerCase() === 'nacional');
  const expTot = nacSst ? nacSst.expuestos : (sedesSst.reduce((a, x) => a + x.expuestos, 0) || hcCierre);
  const atTot = nacSst ? nacSst.at : (sedesSst.length ? sedesSst.reduce((a, x) => a + x.at, 0) : (sst?.indicadores?.at || 0));
  const tasaNum = expTot > 0 ? atTot / expTot * 100 : 0;
  const semTasa = tasaNum <= 1 ? 'ok' : tasaNum <= 3 ? 'warn' : 'bad';

  // ── SLIDE 11: INDICADORES SST (sección) ──
  if (['sst','sst_tasa','sst_severidad','sst_investigacion','ausentismo'].some(on)) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'Indicadores Seguridad y Salud en el Trabajo', 'Dec. 1072/2015 · ' + mesStr);
    addKPIs(s, [
      { label: 'Accidentes AT', value: sst?.indicadores?.at || 0, sem: (sst?.indicadores?.at || 0) > 0 ? 'bad' : 'ok' },
      { label: 'OC / Tránsito', value: sst?.indicadores?.oc || 0, sem: (sst?.indicadores?.oc || 0) > 0 ? 'warn' : 'ok' },
      { label: 'Días EG', value: sst?.indicadores?.eg || 0 },
      { label: 'Cobertura ARL', value: (sst?.indicadores?.arl || 0) + '%' },
    ], 2.2);
    s.addChart('bar', [{ name: 'SST', labels: ['AT', 'OC', 'Mat.', 'EG días', 'Casos'], values: [sst?.indicadores?.at || 0, sst?.indicadores?.oc || 0, sst?.indicadores?.maternidad || 0, sst?.indicadores?.eg || 0, (sst?.casos || []).length] }], { x: 1, y: 3.5, w: 8, h: 3.0, barDir: 'col', showValue: true, chartColors: [RO, AM, '2196F3', '7B68EE', '607D8B'] });
  }

  // ── SLIDE 12: NÚMERO DE EXPUESTOS Y ACCIDENTES ──
  if (on('sst')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'NÚMERO DE EXPUESTOS Y ACCIDENTES DE TRABAJO', `${expTot} expuestos · ${sst?.indicadores?.at || 0} AT`);
    s.addChart('bar', [{ name: 'Expuestos vs AT', labels: ['Expuestos', 'AT', 'OC'], values: [expTot, sst?.indicadores?.at || 0, sst?.indicadores?.oc || 0] }], { x: 1.5, y: 3.2, w: 7, h: 3.3, barDir: 'col', showValue: true, chartColors: [VD, RO, AM] });
    s.addText(`Población expuesta: ${expTot} trabajadores`, { x: 0.5, y: 6.7, w: 9, h: 0.25, fontSize: 10, color: '5A6A5A', align: 'center' });
  }

  // ── SLIDE 13: TASA DE ACCIDENTALIDAD (por sede) ──
  if (on('sst_tasa')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    const tasa = tasaNum.toFixed(2);
    addSectionTitle(s, 'TASA DE ACCIDENTALIDAD', `Tasa: ${tasa}% · Meta ≤ 1%`);
    addKPIs(s, [
      { label: 'Tasa', value: tasa + '%', sem: semTasa },
      { label: 'AT', value: atTot },
      { label: 'Expuestos', value: expTot },
    ], 2.2);
    if (sedesSst.length) {
      const enc = (t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: VD } } });
      const filas = [[enc('Sede'), enc('Accidentes'), enc('Expuestos'), enc('Tasa')]];
      sedesSst.slice(0, 8).forEach(x => filas.push([x.sede, String(x.at), String(x.expuestos), x.expuestos > 0 ? (x.at / x.expuestos * 100).toFixed(2) + '%' : '—']));
      s.addTable(filas, { x: 1, y: 3.8, w: 8, fontSize: 10.5, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.3 });
    } else {
      s.addText('Tasa calculada con el personal activo al cierre del mes.', { x: 1, y: 4.2, w: 8, h: 0.4, fontSize: 10, color: '5A6A5A', align: 'center' });
    }
  }

  // ── SLIDE 14: SEVERIDAD ──
  if (on('sst_severidad')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    const dias = +sst?.severidad?.diasAT || 0; const conDias = +sst?.severidad?.conDias || 0;
    addSectionTitle(s, 'SEVERIDAD DE LOS ACCIDENTES DE TRABAJO', `Días perdidos: ${dias}`);
    addKPIs(s, [
      { label: 'Días perdidos', value: dias, sem: dias === 0 ? 'ok' : 'warn', sub: 'por accidentes de trabajo' },
      { label: 'Accidentes con incapacidad', value: conDias },
      { label: 'Promedio por accidente', value: conDias > 0 ? (dias / conDias).toFixed(1) + ' días' : '—' },
    ], 2.2);
    const atCasos = (sst?.casos || []).filter(c => c.origen === 'AT laboral');
    if (atCasos.length) {
      s.addTable([['Colaborador', 'Estado', 'Origen'], ...atCasos.slice(0, 5).map(c => [c.nombre || '—', c.estado || '—', c.origen || '—'])], { x: 1, y: 3.8, w: 8, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.28 });
    } else {
      s.addText(dias === 0 ? 'Ningún accidente generó días perdidos este mes ✓' : 'Días de incapacidad registrados por accidentes de trabajo.', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 11, color: dias === 0 ? VD : '5A6A5A', align: 'center' });
    }
  }

  // ── SLIDE 15: AUSENTISMO POR E.G. ──
  if (on('ausentismo')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'AUSENTISMO POR E.G.', `Tasa ${ausentismo?.tasa || 0}% · ${ausentismo?.horas || 0} horas`);
    addKPIs(s, [
      { label: 'Tasa', value: (ausentismo?.tasa || 0) + '%', sem: (ausentismo?.tasa || 0) <= 2 ? 'ok' : (ausentismo?.tasa || 0) <= 4 ? 'warn' : 'bad' },
      { label: 'Horas', value: ausentismo?.horas || 0 },
      { label: 'Eventos', value: ausentismo?.eventos || 0 },
      { label: 'Días perdidos', value: ausentismo?.diasPerdidos || 0 },
    ], 2.2);
    s.addChart('bar', [{ name: 'Ausentismo', labels: ['Horas', 'Eventos', 'Días perd.'], values: [ausentismo?.horas || 0, ausentismo?.eventos || 0, ausentismo?.diasPerdidos || 0] }], { x: 1.5, y: 3.5, w: 7, h: 3.0, barDir: 'col', showValue: true, chartColors: [VD, AM, RO] });
    if (ausentismo?.causas) s.addText(`Causas: ${ausentismo.causas}`, { x: 0.8, y: 6.6, w: 8.4, h: 0.4, fontSize: 10, color: '5A6A5A' });
  }

  // ── SLIDE 16: DIAGNÓSTICO AUSENTISMO POR E.G. ──
  if (on('ausentismo')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'DIAGNÓSTICO AUSENTISMO', 'POR E.G. — Principales causas');
    if (ausentismo?.causas) {
      s.addText(ausentismo.causas, { x: 0.8, y: 2.8, w: 8.4, h: 1.2, fontSize: 10, color: '12212D' });
    } else {
      s.addText('Registre las causas de ausentismo en el paso Ausentismo para visualizar el diagnóstico aquí.', { x: 1, y: 4, w: 8, h: 0.5, fontSize: 10, color: '5A6A5A', align: 'center' });
    }
    if (ausentismo?.obs) {
      s.addShape('rect', { x: 0.8, y: 4.5, w: 8.4, h: 1.4, fill: { color: 'FDF6D8' }, line: { color: AM, width: 1 } });
      s.addText(`Plan de acción: ${ausentismo.obs}`, { x: 1, y: 4.7, w: 8, h: 1, fontSize: 9, color: '5A6010' });
    }
  }

  // ── SLIDE 17: CASOS MÉDICOS ──
  if (on('sst')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'CASOS MÉDICOS', `${(sst?.casos || []).length} caso(s) en seguimiento`);
    if ((sst?.casos || []).length) {
      const rows = [[{ text: '#', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Colaborador', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'ID', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Diagnóstico', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Origen', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }]];
      (sst.casos || []).slice(0, 12).forEach((c, i) => rows.push([String(i + 1), c.nombre || '—', c.identificacion || '—', (c.cie10 || '—').slice(0, 18), c.origen || '—', c.estado || '—']));
      s.addTable(rows, { x: 0.3, y: 2.4, w: 9.4, fontSize: 9.5, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.24, colW: [0.4, 2.2, 1.4, 1.8, 1.4, 1.2] });
    } else {
      s.addText('Sin casos médicos registrados este mes ✓', { x: 1, y: 4, w: 8, h: 0.5, fontSize: 12, bold: true, color: VD, align: 'center' });
    }
  }

  // ── SLIDE 18: INVESTIGACIÓN DE ACCIDENTES ──
  if (on('sst_investigacion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    const tot = +sst?.investigacion?.total || 0; const hechos = +sst?.investigacion?.investigados || 0; const tiempo = +sst?.investigacion?.aTiempo || 0;
    const pct = tot > 0 ? Math.min(100, hechos / tot * 100) : 0;
    addSectionTitle(s, 'INVESTIGACIÓN DE ACCIDENTES DE TRABAJO', tot > 0 ? `Cumplimiento: ${Math.round(pct)}% · Meta 100%` : 'Sin accidentes por investigar');
    if (tot > 0) {
      addKPIs(s, [
        { label: 'Por investigar', value: tot },
        { label: 'Investigados', value: hechos, sem: hechos >= tot ? 'ok' : 'warn' },
        ...(tiempo > 0 ? [{ label: 'A tiempo (15 días)', value: tiempo }] : []),
        { label: 'Cumplimiento', value: Math.round(pct) + '%', sem: pct >= 100 ? 'ok' : pct >= 80 ? 'warn' : 'bad' },
      ], 2.2);
      s.addChart('bar', [{ name: 'Investigación', labels: ['Por investigar', 'Investigados', 'A tiempo'], values: [tot, hechos, tiempo] }], { x: 1.5, y: 3.5, w: 7, h: 3.0, barDir: 'col', showValue: true, chartColors: ['607D8B', VD, '2196F3'] });
    } else {
      s.addText('No hubo accidentes que investigar este mes ✓', { x: 1, y: 4, w: 8, h: 0.5, fontSize: 12, bold: true, color: VD, align: 'center' });
    }
  }

  // ── Capacitación ──
  if (on('capacitacion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'CAPACITACIÓN Y FORMACIÓN', mesStr);
    addKPIs(s, [
      { label: 'Horas de formación', value: +capacitacion?.horas || 0 },
      { label: 'Personas capacitadas', value: +capacitacion?.personas || 0 },
      { label: 'Cobertura', value: (+capacitacion?.cobertura || 0) + '%' },
    ], 2.2);
    const temas = (capacitacion?.temas || []).filter(t => t?.tema);
    if (temas.length) {
      s.addTable([
        [{ text: 'Tema', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Asistentes', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Horas', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }],
        ...temas.slice(0, 8).map(t => [String(t.tema), fmtKpi(+t.asistentes || 0), fmtKpi(+t.horas || 0)]),
      ], { x: 1, y: 3.5, w: 8, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.32, colW: [5, 1.5, 1.5] });
    }
    if (capacitacion?.obs) s.addText(String(capacitacion.obs), { x: 1, y: 6.3, w: 8, h: 0.5, fontSize: 10, color: '5A6A5A' });
  }

  // ── Clima laboral ──
  if (on('clima')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'CLIMA LABORAL Y BIENESTAR', mesStr);
    const sat = +clima?.satisfaccion || 0;
    addKPIs(s, [
      { label: 'Satisfacción', value: sat + '%', sem: sat >= 85 ? 'ok' : sat >= 70 ? 'warn' : 'bad' },
      { label: 'eNPS', value: +clima?.enps || 0 },
      { label: 'Participación', value: (+clima?.participacion || 0) + '%' },
      { label: 'Actividades', value: +clima?.actividades || 0 },
    ], 2.2);
    if (clima?.encuesta) s.addText('“' + clima.encuesta + '”', { x: 1, y: 3.6, w: 8, h: 1, fontSize: 12, italic: true, color: OSC });
    if (clima?.plan) s.addText('Plan de mejora: ' + clima.plan, { x: 1, y: 4.8, w: 8, h: 1, fontSize: 11, color: '5A6A5A' });
  }

  // ── Facturación ──
  if (on('facturacion')) {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'FACTURACIÓN Y FINANCIERO', mesStr);
    const peso = (v) => '$ ' + (Number(v) || 0).toLocaleString('es-CO');
    addKPIs(s, [
      { label: 'Valor facturado', value: peso(facturacion?.valor) },
      { label: 'Costo nómina', value: peso(facturacion?.costo) },
      { label: 'Margen', value: (+facturacion?.margen || 0) + '%' },
      { label: 'Estado', value: facturacion?.estado || 'Al día', sem: facturacion?.estado === 'En mora' ? 'bad' : 'ok' },
    ], 2.2);
    if (facturacion?.obs) s.addText(String(facturacion.obs), { x: 1, y: 3.6, w: 8, h: 1, fontSize: 11, color: '5A6A5A' });
  }

  // ── SLIDE 18: GRACIAS ──
  {
    const s = pptx.addSlide();
    s.background = { color: VD };
    s.addText('¡Gracias!', { x: 0.5, y: 2.2, w: 9, h: 0.7, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' });
    s.addShape('rect', { x: 4.2, y: 3.1, w: 1.6, h: 0.06, fill: { color: AM } });
    s.addText('CONECTAMOS PERSONAS', { x: 0.5, y: 3.6, w: 9, h: 0.4, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center' });
    s.addText('con una mejor calidad de VIDA', { x: 0.5, y: 4.1, w: 9, h: 0.35, fontSize: 13, color: 'E8F5EE', align: 'center' });
    s.addText(`${cliNom}  •  ${mesStr}`, { x: 0.5, y: 5.0, w: 9, h: 0.3, fontSize: 11, color: AM, align: 'center' });
    s.addText('Informe generado con Plataforma Informes PT • Proservis Temporales', { x: 0.5, y: 6.9, w: 9, h: 0.25, fontSize: 9, color: 'E8F5EE', align: 'center' });
  }

  const fileName = `Informe_${cliNom.replace(/\\s+/g, '_')}_${mesStr.replace(' ', '_')}.pptx`;
  const blob = await pptx.write({ outputType: 'blob' });
  return { blob, fileName, pptx };
}

export function downloadPPTX(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
