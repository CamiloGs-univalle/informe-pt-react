/**
 * services/pptxReport.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Genera un .pptx 100% fiel a la PLANTILLA OPERACIONES - INFORME DE GESTION
 * 18 slides con datos reales + gráficas nativas de pptxgenjs.
 * Usa datos del mismo `buildInformePreviewHtml` (selección, rotación, SST, etc.)
 */
import PptxGenJS from 'pptxgenjs';
import { MESES_LARGOS } from '../utils/format';

const VD = '168A43';
const VDO = '0F6B33';
const AM = 'E8BB26';
const OSC = '12212D';
const GR = 'F2F4F2';
const RO = 'C0392B';

function addHeader(slide, mesStr, cliNom) {
  slide.background = { color: 'FFFFFF' };
  // franja superior verde
  slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.85, fill: { color: VD } });
  slide.addText('Indicadores de Gestión', { x: 0.5, y: 0.15, w: 9, h: 0.3, fontSize: 14, bold: true, color: 'FFFFFF', align: 'center' });
  slide.addText(`Conectamos personas con una mejor calidad de vida  •  ${mesStr}  •  ${cliNom}`, { x: 0.5, y: 0.45, w: 9, h: 0.2, fontSize: 7, color: 'FFFFFF', align: 'center' });
  // footer
  slide.addShape('rect', { x: 0, y: 7.1, w: '100%', h: 0.4, fill: { color: OSC } });
  slide.addText(`Informe confidencial • ${cliNom} • ${mesStr} • Proservis Temporales`, { x: 0.3, y: 7.15, w: 8, h: 0.3, fontSize: 7, color: 'FFFFFF' });
}

function addSectionTitle(slide, title, subtitle) {
  slide.addShape('rect', { x: 0.4, y: 1.0, w: 9.2, h: 0.9, fill: { color: VD }, rectRadius: 0.15 });
  slide.addText(title, { x: 0.6, y: 1.15, w: 8.8, h: 0.35, fontSize: 18, bold: true, color: 'FFFFFF' });
  if (subtitle) slide.addText(subtitle, { x: 0.6, y: 1.5, w: 8.8, h: 0.2, fontSize: 9, color: 'FFFFFF' });
}

function addKPIs(slide, kpis, y = 2.2) {
  const w = 2.15, gap = 0.2;
  kpis.forEach((k, i) => {
    const x = 0.4 + i * (w + gap);
    const bg = k.sem === 'bad' ? RO : k.sem === 'warn' ? AM : 'FFFFFF';
    const txtCol = k.sem === 'bad' || k.sem === 'warn' ? 'FFFFFF' : VD;
    slide.addShape('roundRect', { x, y, w, h: 0.95, fill: { color: 'FFFFFF' }, line: { color: k.sem === 'bad' ? RO : k.sem === 'warn' ? AM : VD, width: 1.2 }, rectRadius: 0.12 });
    slide.addText(k.label, { x, y: y + 0.08, w, h: 0.18, fontSize: 6, bold: true, color: '62748A', align: 'center' });
    slide.addText(String(k.value), { x, y: y + 0.28, w, h: 0.32, fontSize: 16, bold: true, color: txtCol, align: 'center' });
    if (k.sub) slide.addText(k.sub, { x, y: y + 0.62, w, h: 0.18, fontSize: 6, color: '62748A', align: 'center' });
  });
}

export async function generateInformePPTX(state) {
  const { cliId, periodo, ejecutivo, headcount, sst, nomina, seleccion, rotacion, fotos, ausentismo, capacitacion, clima, facturacion, activeModules, cliNomOverride, cliMarcaOverride } = state;
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
    s.addText('Logo del cliente', { x: 7.9, y: 2.9, w: 2.5, h: 0.2, fontSize: 7, color: '5A6A5A', align: 'center' });
    s.addText('Conectamos personas con una mejor calidad de vida', { x: 0.8, y: 6.8, w: 8, h: 0.25, fontSize: 8, italic: true, color: 'FFFFFF' });
  }

  // ── SLIDE 2: INDICADORES SELECCIÓN Y CONTRATACIÓN (sección) ──
  {
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
    s.addText('Fuente: Selección y Contratación', { x: 0.4, y: 6.85, w: 9, h: 0.2, fontSize: 6, color: '5A6A5A' });
  }

  // ── SLIDE 3: OPORTUNIDAD ──
  {
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
      const labels = (seleccion || []).slice(0, 6).map(r => (r.rq || r.cargo).slice(0, 10));
      const vals = (seleccion || []).slice(0, 6).map(r => +r.diasCobertura || 0);
      s.addChart('bar', [{ name: 'Días', labels, values: vals }], { x: 0.8, y: 3.5, w: 8.5, h: 3.0, barDir: 'col', showValue: true, chartColors: [AM], showLegend: false });
    } else {
      s.addText('Registre "días de cobertura" por RQ en el Excel (columna Días/Oportunidad) para ver la gráfica aquí.', { x: 1, y: 4, w: 8, h: 1, fontSize: 10, color: '5A6A5A', align: 'center' });
      s.addShape('rect', { x: 1, y: 5, w: 8, h: 0.08, fill: { color: AM } });
    }
  }

  // ── SLIDE 4: EFECTIVIDAD ──
  {
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
    if (rows.length > 1) s.addTable(rows, { x: 6.8, y: 3.5, w: 3.0, fontSize: 7, color: '12212D', border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.28, colW: [0.8, 0.6, 0.6, 0.6] });
  }

  // ── SLIDE 5: VACANTES ACTIVAS ──
  {
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
      s.addChart('bar', [{ name: 'Pendientes', labels: pendientes.map(r => (r.rq || r.cargo).slice(0, 10)), values: pendientes.map(r => (r.solicitadas || 0) - (r.contratadas || 0)) }], { x: 1, y: 3.6, w: 8, h: 3.0, barDir: 'bar', showValue: true, chartColors: [RO], showLegend: false });
    } else {
      s.addText(pend === 0 ? '¡Sin vacantes activas! Todas cubiertas ✓' : 'Sin detalle por RQ', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 14, bold: true, color: VD, align: 'center' });
    }
  }

  // ── SLIDE 6: ADMINISTRACIÓN DE PERSONAL (sección) ──
  {
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
  {
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
  {
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
  {
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
    ], { x: 2, y: 3.5, w: 6, fontSize: 9, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.32, colW: [3, 3] });
    if (nomina?.observaciones) s.addText(nomina.observaciones, { x: 1, y: 6.2, w: 8, h: 0.5, fontSize: 8, color: '5A6A5A', align: 'center' });
  }

  // ── SLIDE 10: ACTIVIDADES DE BIENESTAR ──
  {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'ACTIVIDADES DE BIENESTAR', 'ESTA DIAPOSITIVA SE UTILIZA SOLO SI SE TIENEN ACTIVIDADES — ' + mesStr);
    s.addText('Registro fotográfico — 9 espacios disponibles', { x: 0.5, y: 2.4, w: 9, h: 0.25, fontSize: 8, color: '5A6A5A', align: 'center' });
    // Grid 3x3 placeholders
    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.7 + col * 3.05, y = 2.8 + row * 1.35;
      const hasImg = fotos && fotos[i];
      if (hasImg) {
        // fotos is object with data URLs; add as image via base64
        try { s.addImage({ data: fotos[i], x, y, w: 2.85, h: 1.15 }); } catch { s.addShape('rect', { x, y, w: 2.85, h: 1.15, fill: { color: 'F2F4F2' }, line: { color: 'DDE4DD', width: 0.5 } }); }
      } else {
        s.addShape('rect', { x, y, w: 2.85, h: 1.15, fill: { color: 'F2F4F2' }, line: { color: 'DDE4DD', width: 0.5, dashType: 'dash' } });
        s.addText('+', { x, y: y + 0.25, w: 2.85, h: 0.3, fontSize: 16, color: 'DDE4DD', align: 'center' });
      }
      const labels = ['Inducción SST', 'Capacitación', 'Inspección EPP', 'Actividad bienestar', 'Visita cliente', 'Otra', 'Actividad 7', '8', '9'];
      s.addText(labels[i] || '', { x, y: y + 0.95, w: 2.85, h: 0.15, fontSize: 6, color: 'FFFFFF', fill: { color: '12212D' }, align: 'center' });
    }
  }

  // ── SLIDE 11: INDICADORES SST (sección) ──
  {
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
  {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'NÚMERO DE EXPUESTOS Y ACCIDENTES DE TRABAJO', `${hcCierre} expuestos · ${sst?.indicadores?.at || 0} AT`);
    s.addChart('bar', [{ name: 'Expuestos vs AT', labels: ['Expuestos', 'AT', 'OC'], values: [hcCierre, sst?.indicadores?.at || 0, sst?.indicadores?.oc || 0] }], { x: 1.5, y: 3.2, w: 7, h: 3.3, barDir: 'col', showValue: true, chartColors: [VD, RO, AM] });
    s.addText(`Población expuesta: ${hcCierre} trabajadores`, { x: 0.5, y: 6.7, w: 9, h: 0.25, fontSize: 8, color: '5A6A5A', align: 'center' });
  }

  // ── SLIDE 13: TASA DE ACCIDENTALIDAD ──
  {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    const tasa = hcCierre ? ((sst?.indicadores?.at || 0) / hcCierre * 100).toFixed(2) : '0.00';
    addSectionTitle(s, 'TASA DE ACCIDENTALIDAD A NIVEL NACIONAL', `Tasa: ${tasa}% · Meta < 3%`);
    addKPIs(s, [
      { label: 'Tasa', value: tasa + '%', sem: +tasa <= 1 ? 'ok' : +tasa <= 3 ? 'warn' : 'bad' },
      { label: 'AT', value: sst?.indicadores?.at || 0 },
      { label: 'Expuestos', value: hcCierre },
    ], 2.2);
    // gauge simulation with bar
    s.addShape('rect', { x: 1, y: 4, w: 8, h: 0.45, fill: { color: 'E8EAE8' }, rectRadius: 0.2 });
    const pctBar = Math.min(100, +tasa * 20); // scale 5% = 100%
    s.addShape('rect', { x: 1, y: 4, w: 8 * pctBar / 100, h: 0.45, fill: { color: +tasa <= 1 ? VD : +tasa <= 3 ? AM : RO }, rectRadius: 0.2 });
    s.addText(`${tasa}%`, { x: 1, y: 4.6, w: 8, h: 0.3, fontSize: 10, bold: true, color: '12212D', align: 'center' });
  }

  // ── SLIDE 14: SEVERIDAD ──
  {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'SEVERIDAD DE ACCIDENTALIDAD A NIVEL NACIONAL', `Días perdidos: ${sst?.indicadores?.eg || 0}`);
    addKPIs(s, [
      { label: 'Días perdidos', value: sst?.indicadores?.eg || 0, sub: 'por AT/EG' },
      { label: 'Casos', value: (sst?.casos || []).length },
      { label: 'Severidad', value: (sst?.indicadores?.eg || 0) + ' días' },
    ], 2.2);
    if ((sst?.casos || []).length) {
      const labels = (sst.casos || []).slice(0, 5).map(c => (c.nombre || 'Caso').split(' ')[0]);
      const vals = (sst.casos || []).slice(0, 5).map(() => sst?.indicadores?.eg || 0);
      s.addTable([['Colaborador', 'Días', 'Origen'], ...((sst.casos || []).slice(0, 4).map(c => [c.nombre || '—', String(sst?.indicadores?.eg || 0), c.origen || '—']))], { x: 1, y: 3.8, w: 8, fontSize: 7, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.28 });
    } else {
      s.addText('Sin casos con días perdidos este mes', { x: 1, y: 4.5, w: 8, h: 0.5, fontSize: 11, color: '5A6A5A', align: 'center' });
    }
  }

  // ── SLIDE 15: AUSENTISMO POR E.G. ──
  {
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
    if (ausentismo?.causas) s.addText(`Causas: ${ausentismo.causas}`, { x: 0.8, y: 6.6, w: 8.4, h: 0.4, fontSize: 8, color: '5A6A5A' });
  }

  // ── SLIDE 16: DIAGNÓSTICO AUSENTISMO POR E.G. ──
  {
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
  {
    const s = pptx.addSlide();
    addHeader(s, mesStr, cliNom);
    addSectionTitle(s, 'CASOS MÉDICOS', `${(sst?.casos || []).length} caso(s) en seguimiento`);
    if ((sst?.casos || []).length) {
      const rows = [[{ text: '#', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Colaborador', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'ID', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Diagnóstico', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Origen', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }, { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: VD } } }]];
      (sst.casos || []).slice(0, 12).forEach((c, i) => rows.push([String(i + 1), c.nombre || '—', c.identificacion || '—', (c.cie10 || '—').slice(0, 18), c.origen || '—', c.estado || '—']));
      s.addTable(rows, { x: 0.3, y: 2.4, w: 9.4, fontSize: 6.5, border: { type: 'solid', pt: 0.5, color: 'DDE4DD' }, rowH: 0.24, colW: [0.4, 2.2, 1.4, 1.8, 1.4, 1.2] });
    } else {
      s.addText('Sin casos médicos registrados este mes ✓', { x: 1, y: 4, w: 8, h: 0.5, fontSize: 12, bold: true, color: VD, align: 'center' });
    }
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
    s.addText('Informe generado con Plataforma Informes PT • Proservis Temporales', { x: 0.5, y: 6.9, w: 9, h: 0.25, fontSize: 7, color: 'E8F5EE', align: 'center' });
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
