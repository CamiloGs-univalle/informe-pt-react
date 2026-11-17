/**
 * services/reportMetrics.js
 * ─────────────────────────────────────────────────────────────────────────
 * Todo lo que el reporte HTML "piensa" antes de dibujar: cifras derivadas,
 * semáforos contra su meta, comparación con el mes anterior y los mensajes en
 * lenguaje simple (qué va bien, qué vigilar, qué sigue). Es puro: no toca DOM,
 * ni DB, ni React; recibe datos y devuelve datos. Así se puede probar solo y
 * reutilizar (el mes anterior se calcula con exactamente las mismas reglas).
 *
 * Las metas son las de referencia de Proservis que ya usaba el reporte
 * (selección ≥ 80 %, rotación ≤ 3 %, ausentismo ≤ 2 %, satisfacción ≥ 85 %,
 * cero accidentes). Se muestran siempre junto al número, para que quien lee
 * sepa contra qué se compara.
 */
import { MESES_LARGOS, fmtNum, fmtDec, fmtMoney } from '../utils/format.js';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export const METAS = {
  seleccion: { ok: 80, warn: 50 },   // % — más es mejor
  rotacion: { ok: 3, warn: 6 },      // % — menos es mejor
  ausentismo: { ok: 2, warn: 4 },    // % — menos es mejor
  satisfaccion: { ok: 85, warn: 70 },// % — más es mejor
  tasaAT: { ok: 1, warn: 3 },        // % — menos es mejor (accidentes ÷ personas expuestas)
  investigacion: { ok: 100, warn: 80 }, // % — más es mejor
};

const estadoAlto = (v, m) => (v >= m.ok ? 'ok' : v >= m.warn ? 'warn' : 'bad');
const estadoBajo = (v, m) => (v <= m.ok ? 'ok' : v <= m.warn ? 'warn' : 'bad');

/** Tipo de retiro según su motivo (misma clasificación que ya usaba el reporte). */
export function clasificarMotivo(motivo) {
  const t = String(motivo || '').toLowerCase();
  if (t.includes('obra') || t.includes('labor')) return 'estructural';
  if (t.includes('cliente')) return 'positivo';
  if (t.includes('abandono')) return 'critico';
  return 'evitable';
}

/** "2026-10" → "Octubre 2026". */
export function nombrePeriodo(per) {
  const [y, m] = String(per || '').split('-');
  return (MESES_LARGOS[+m - 1] || '—') + ' ' + (y || '');
}

/** Cifras derivadas de los datos de un informe. `extras` trae ausentismo, capacitación, clima y facturación. */
export function calcularMetricas(d, rqs, motivos, casos, extras = {}) {
  const aus = extras.ausentismo || d.ausentismo || {};
  const cap = extras.capacitacion || d.capacitacion || {};
  const clima = extras.clima || d.clima || {};
  const fac = extras.facturacion || d.facturacion || {};

  let rqSol = 0; let rqCon = 0;
  (rqs || []).forEach(r => { rqSol += num(r.solicitadas); rqCon += num(r.contratadas); });
  const pctSel = rqSol > 0 ? Math.round(rqCon / rqSol * 100) : 0;

  const mot = (motivos || []).filter(m => m.motivo && num(m.cantidad) > 0);
  const totMot = (motivos || []).reduce((s, m) => s + num(m.cantidad), 0);
  const hcInicio = num(d.hcInicio); const hcIng = num(d.hcIng); const hcRet = num(d.hcRet);
  const hcCierre = d.hcCierre != null ? num(d.hcCierre) : hcInicio + hcIng - hcRet;
  const tasaRot = hcCierre > 0 ? Math.round(totMot / hcCierre * 1000) / 10 : 0;
  const porTipo = { estructural: 0, positivo: 0, critico: 0, evitable: 0 };
  mot.forEach(m => { porTipo[clasificarMotivo(m.motivo)] += num(m.cantidad); });

  // SST por sede: cada fila trae accidentes y personas expuestas; la tasa se calcula aquí, nunca se digita.
  const sedes = (d.sstSedes || []).filter(x => String(x.sede || '').trim()).map(x => {
    const at = num(x.at); const exp = num(x.expuestos);
    return { sede: String(x.sede).trim(), at, expuestos: exp, tasa: exp > 0 ? at / exp * 100 : null };
  });
  const conBase = sedes.filter(x => x.expuestos > 0);
  const nac = conBase.find(x => x.sede.toLowerCase() === 'nacional');
  const totAt = conBase.reduce((a, x) => a + x.at, 0); const totExp = conBase.reduce((a, x) => a + x.expuestos, 0);
  let tasaAT = 0; let tasaOrigen = 'ninguno';
  if (nac) { tasaAT = nac.tasa; tasaOrigen = 'sedes'; }
  else if (totExp > 0) { tasaAT = totAt / totExp * 100; tasaOrigen = 'sedes'; }
  else if (hcCierre > 0) { tasaAT = num(d.at) / hcCierre * 100; tasaOrigen = 'headcount'; }
  const sev = d.sstSev || {}; const inv = d.sstInv || {};
  const sevDias = num(sev.diasAT); const sevConDias = num(sev.conDias);
  const sevProm = sevConDias > 0 ? sevDias / sevConDias : 0;
  const invTotal = num(inv.total); const invHechos = num(inv.investigados); const invTiempo = num(inv.aTiempo);
  const invPct = invTotal > 0 ? Math.min(100, invHechos / invTotal * 100) : 0;
  const invTiempoPct = invTotal > 0 ? Math.min(100, invTiempo / invTotal * 100) : 0;

  return {
    per: d.per,
    sedes, tasaOrigen, hayTasa: tasaOrigen !== 'ninguno',
    sevDias, sevConDias, sevProm,
    invTotal, invHechos, invTiempo, invPct, invTiempoPct,
    rqSol, rqCon, rqPend: Math.max(0, rqSol - rqCon), pctSel, hayRq: (rqs || []).length > 0,
    hcInicio, hcIng, hcRet, hcCierre, neto: hcCierre - hcInicio,
    totMot, tasaRot, porTipo,
    at: num(d.at), oc: num(d.oc), mat: num(d.mat), eg: num(d.eg), arl: num(d.arl), ind: num(d.ind),
    casos: (casos || []).length,
    tasaAT,
    nliq: num(d.nliq), ninc: num(d.ninc), nlic: num(d.nlic), nhed: num(d.nhed), nhen: num(d.nhen), nerr: num(d.nerr),
    ausTasa: num(aus.tasa), ausHoras: num(aus.horas), ausEventos: num(aus.eventos), ausDias: num(aus.diasPerdidos),
    capHoras: num(cap.horas), capPersonas: num(cap.personas), capCobertura: num(cap.cobertura),
    satisfaccion: num(clima.satisfaccion), enps: num(clima.enps), participacion: num(clima.participacion), actividades: num(clima.actividades),
    facValor: num(fac.valor), facCosto: num(fac.costo), facMargen: num(fac.margen), facCartera: num(fac.cartera),
    facEstado: fac.estado || 'Al día', facCumplimiento: fac.cumplimiento != null ? num(fac.cumplimiento) : 100,
    // "Sin datos": todo en cero casi seguro significa que nadie lo llenó; no se debe presentar como un resultado.
    sdHc: hcInicio === 0 && hcIng === 0 && hcRet === 0 && hcCierre === 0,
    sdClima: num(clima.satisfaccion) === 0 && num(clima.participacion) === 0 && num(clima.enps) === 0 && num(clima.actividades) === 0,
    sdFac: num(fac.valor) === 0 && num(fac.costo) === 0,
    get vacio() { return this.sdHc && this.sdClima && this.sdFac && !this.hayRq && this.totMot === 0 && !this.at && !this.oc && !this.nliq && !this.nerr && !this.ausHoras && !this.ausTasa && !this.capHoras; },
  };
}

const activo = (active, id) => !Array.isArray(active) || active.includes(id);
const any = (active, ...ids) => ids.some(i => activo(active, i));

/**
 * Indicadores que se muestran como tarjetas del resumen (uno por módulo activo),
 * ya con su semáforo, su meta y el cambio frente al mes anterior.
 * `prev` = métricas del mes anterior (o null).
 */
export function construirIndicadores(m, active, prev) {
  const out = [];
  const add = (x) => out.push(x);

  if (activo(active, 'seleccion')) add({
    id: 'seleccion', tab: 'sel', icono: '🎯', nombre: 'Efectividad de selección',
    valor: m.pctSel, texto: m.hayRq ? fmtNum(m.pctSel) + ' %' : '—', unidad: 'pts',
    estado: m.hayRq ? estadoAlto(m.pctSel, METAS.seleccion) : 'info',
    meta: 'Meta: 80 % o más', sub: m.hayRq ? `${fmtNum(m.rqCon)} de ${fmtNum(m.rqSol)} vacantes cubiertas` : 'Sin vacantes este mes',
    explica: 'De cada 100 vacantes que pidió la empresa, cuántas ya tienen una persona contratada.',
    mejor: 'alto', prev: prev?.hayRq ? prev.pctSel : null,
  });
  if (activo(active, 'headcount')) add({
    id: 'headcount', tab: 'hc', icono: '👥', nombre: 'Personas activas',
    valor: m.hcCierre, texto: fmtNum(m.hcCierre), unidad: 'personas',
    estado: m.neto >= 0 ? 'ok' : 'warn', meta: 'Meta: mantener o crecer',
    sub: `Inicio ${fmtNum(m.hcInicio)} · +${fmtNum(m.hcIng)} ingresos · −${fmtNum(m.hcRet)} retiros`,
    explica: 'Cuántas personas trabajan para la empresa al cierre del mes.',
    mejor: 'alto', prev: prev ? prev.hcCierre : null,
  });
  if (activo(active, 'rotacion')) add({
    id: 'rotacion', tab: 'rot', icono: '🔄', nombre: 'Rotación',
    valor: m.tasaRot, texto: fmtDec(m.tasaRot) + ' %', unidad: 'pts',
    estado: estadoBajo(m.tasaRot, METAS.rotacion), meta: 'Saludable: hasta 3 %',
    sub: `${fmtNum(m.totMot)} ${m.totMot === 1 ? 'retiro' : 'retiros'} en el mes`,
    explica: 'Qué parte del personal se retiró durante el mes. Mientras más baja, mejor.',
    mejor: 'bajo', prev: prev ? prev.tasaRot : null,
  });
  if (activo(active, 'sst')) add({
    id: 'sst', tab: 'sst', icono: '🛡️', nombre: 'Accidentes de trabajo',
    valor: m.at, texto: fmtNum(m.at), unidad: m.at === 1 ? 'accidente' : 'accidentes',
    estado: m.at === 0 ? 'ok' : m.at === 1 ? 'warn' : 'bad', meta: 'Meta: cero accidentes',
    sub: m.casos ? `${fmtNum(m.casos)} ${m.casos === 1 ? 'caso médico' : 'casos médicos'} en seguimiento` : 'Sin casos médicos en seguimiento',
    explica: 'Accidentes ocurridos en el trabajo durante el mes (AT). El objetivo siempre es cero.',
    mejor: 'bajo', prev: prev ? prev.at : null,
  });
  if (activo(active, 'sst_tasa')) add({
    id: 'sst_tasa', tab: 'sst', icono: '📈', nombre: 'Tasa de accidentalidad',
    valor: m.tasaAT, texto: fmtDec(m.tasaAT) + ' %', unidad: 'pts',
    estado: estadoBajo(m.tasaAT, METAS.tasaAT), meta: 'Meta: hasta 1 %',
    sub: m.sedes.length > 1 ? `${fmtNum(m.sedes.length)} sedes reportadas` : m.tasaOrigen === 'headcount' ? 'Calculada con el personal activo' : 'Accidentes sobre personas expuestas',
    explica: 'Por cada 100 personas expuestas, cuántos accidentes de trabajo hubo en el mes.',
    mejor: 'bajo', prev: prev?.hayTasa ? prev.tasaAT : null,
  });
  if (activo(active, 'sst_severidad')) add({
    id: 'sst_severidad', tab: 'sst', icono: '⚠️', nombre: 'Días perdidos por accidentes',
    valor: m.sevDias, texto: fmtNum(m.sevDias), unidad: m.sevDias === 1 ? 'día' : 'días',
    estado: m.sevDias === 0 ? 'ok' : 'warn', meta: 'Meta: cero días perdidos',
    sub: m.sevConDias > 0 ? `${fmtNum(m.sevConDias)} ${m.sevConDias === 1 ? 'accidente dejó' : 'accidentes dejaron'} incapacidad` : m.sevDias > 0 ? 'Suma de días de incapacidad' : 'Ningún accidente dejó incapacidad',
    explica: 'Días de trabajo que se perdieron porque alguien quedó incapacitado por un accidente de trabajo. Muestra qué tan graves fueron los accidentes.',
    mejor: 'bajo', prev: prev ? prev.sevDias : null,
  });
  if (activo(active, 'sst_investigacion')) add({
    id: 'sst_investigacion', tab: 'sst', icono: '🔍', nombre: 'Investigación de accidentes',
    valor: m.invPct, texto: m.invTotal > 0 ? fmtNum(Math.round(m.invPct)) + ' %' : '—', unidad: 'pts',
    estado: m.invTotal > 0 ? estadoAlto(m.invPct, METAS.investigacion) : (m.at === 0 ? 'ok' : 'info'), meta: m.invTotal > 0 ? 'Meta: 100 %' : '',
    sub: m.invTotal > 0 ? `${fmtNum(m.invHechos)} de ${fmtNum(m.invTotal)} investigados${m.invTiempo > 0 ? ` · ${fmtNum(m.invTiempo)} a tiempo` : ''}` : m.at === 0 ? 'No hubo accidentes que investigar' : 'Sin datos este mes',
    explica: 'De los accidentes que había que investigar, qué porcentaje ya se investigó. Toda investigación debe hacerse dentro de 15 días.',
    mejor: 'alto', prev: prev?.invTotal > 0 ? prev.invPct : null,
  });
  if (activo(active, 'nomina')) add({
    id: 'nomina', tab: 'nom', icono: '💰', nombre: 'Errores de nómina',
    valor: m.nerr, texto: fmtNum(m.nerr), unidad: m.nerr === 1 ? 'error' : 'errores',
    estado: m.nerr === 0 ? 'ok' : 'bad', meta: 'Meta: cero errores',
    sub: `${fmtNum(m.nliq)} ${m.nliq === 1 ? 'persona liquidada' : 'personas liquidadas'}`,
    explica: 'Fallas encontradas al liquidar la nómina que hubo que corregir.',
    mejor: 'bajo', prev: prev ? prev.nerr : null,
  });
  if (activo(active, 'ausentismo')) add({
    id: 'ausentismo', tab: 'aus', icono: '⏰', nombre: 'Ausentismo',
    valor: m.ausTasa, texto: fmtDec(m.ausTasa) + ' %', unidad: 'pts',
    estado: estadoBajo(m.ausTasa, METAS.ausentismo), meta: 'Meta: hasta 2 %',
    sub: `${fmtNum(m.ausHoras)} horas de ausencia`,
    explica: 'Qué parte del tiempo de trabajo programado no se cumplió por incapacidades, permisos u otras ausencias.',
    mejor: 'bajo', prev: prev ? prev.ausTasa : null,
  });
  if (activo(active, 'clima')) add({
    id: 'clima', tab: 'clima', icono: '😊', nombre: 'Satisfacción del personal',
    valor: m.satisfaccion, texto: fmtNum(m.satisfaccion) + ' %', unidad: 'pts',
    estado: estadoAlto(m.satisfaccion, METAS.satisfaccion), meta: 'Meta: 85 % o más',
    sub: `Participación de la encuesta: ${fmtNum(m.participacion)} %`,
    explica: 'Qué tan conformes están las personas con su trabajo, según la encuesta de clima.',
    mejor: 'alto', prev: prev ? prev.satisfaccion : null,
  });
  if (activo(active, 'capacitacion')) add({
    id: 'capacitacion', tab: 'cap', icono: '🎓', nombre: 'Horas de formación',
    valor: m.capHoras, texto: fmtNum(m.capHoras), unidad: 'horas', estado: 'info', meta: '',
    sub: `${fmtNum(m.capPersonas)} ${m.capPersonas === 1 ? 'persona capacitada' : 'personas capacitadas'}`,
    explica: 'Horas de entrenamiento y formación dadas al personal en el mes.',
    mejor: 'alto', prev: prev ? prev.capHoras : null,
  });
  if (activo(active, 'facturacion')) add({
    id: 'facturacion', tab: 'fac', icono: '🧾', nombre: 'Facturación',
    valor: m.facValor, texto: fmtMoney(m.facValor), unidad: '',
    estado: m.facEstado === 'Al día' ? 'ok' : m.facEstado === 'En mora' ? 'bad' : 'warn', meta: 'Estado: ' + m.facEstado,
    sub: `Margen ${fmtNum(m.facMargen)} % · cartera ${fmtNum(m.facCartera)} días`,
    explica: 'Valor facturado en el mes y si los pagos van al día.',
    mejor: 'neutral', prev: null,
  });

  // Sin datos: se muestra como informativo y vacío, nunca como "0 %" en rojo ni en verde.
  const sd = { headcount: m.sdHc, rotacion: m.sdHc && m.totMot === 0, clima: m.sdClima, facturacion: m.sdFac, sst_tasa: !m.hayTasa, sst_investigacion: m.invTotal === 0 && m.at > 0 };
  out.forEach(i => {
    if (!sd[i.id]) return;
    i.sinDatos = true; i.estado = 'info'; i.texto = '—'; i.unidad = ''; i.meta = ''; i.sub = 'Sin datos este mes'; i.prev = null;
  });

  // Cambio frente al mes anterior
  const mesPrev = prev ? nombrePeriodo(prev.per) : '';
  out.forEach(i => {
    if (i.prev == null || !Number.isFinite(i.prev)) return;
    const diff = Math.round((i.valor - i.prev) * 10) / 10;
    if (diff === 0) { i.delta = { texto: `Igual que en ${mesPrev}`, tono: 'neutral', flecha: '＝' }; return; }
    const sube = diff > 0;
    const tono = i.mejor === 'neutral' ? 'neutral' : (i.mejor === 'alto' ? (sube ? 'ok' : 'bad') : (sube ? 'bad' : 'ok'));
    const cant = i.id === 'facturacion' ? fmtMoney(Math.abs(diff)) : fmtDec(Math.abs(diff)).replace(',0', '');
    i.delta = { texto: `${cant} ${i.unidad ? (i.unidad === 'pts' ? 'puntos' : i.unidad) + ' ' : ''}${sube ? 'más' : 'menos'} que en ${mesPrev}`.replace(/\s+/g, ' '), tono, flecha: sube ? '▲' : '▼' };
  });
  return out;
}

/** Las tres columnas del resumen: qué va bien, qué vigilar y qué sigue. Frases cortas y sin jerga. */
export function construirMensajes(m, indicadores, active, extras = {}, prev) {
  const bien = []; const vigilar = []; const sigue = [];
  const por = (id) => indicadores.find(i => i.id === id);
  const est = (id) => por(id)?.estado;

  if (por('seleccion') && m.hayRq) {
    const e = est('seleccion');
    if (e === 'ok') bien.push(`Se cubrieron ${fmtNum(m.rqCon)} de ${fmtNum(m.rqSol)} vacantes (${fmtNum(m.pctSel)} %): la meta del 80 % está cumplida.`);
    else vigilar.push(`Selección va en ${fmtNum(m.pctSel)} %: faltan ${fmtNum(m.rqPend)} ${m.rqPend === 1 ? 'vacante' : 'vacantes'} para llegar a la meta del 80 %.`);
    if (m.rqPend > 0) sigue.push(`Cerrar con Selección ${m.rqPend === 1 ? 'la vacante pendiente' : 'las ' + fmtNum(m.rqPend) + ' vacantes pendientes'}.`);
  }
  if (por('headcount') && !por('headcount').sinDatos) {
    if (m.neto > 0) bien.push(`La planta creció en ${fmtNum(m.neto)} ${m.neto === 1 ? 'persona' : 'personas'}: pasó de ${fmtNum(m.hcInicio)} a ${fmtNum(m.hcCierre)}.`);
    else if (m.neto === 0) bien.push(`La planta se mantuvo estable en ${fmtNum(m.hcCierre)} personas.`);
    else vigilar.push(`La planta bajó en ${fmtNum(-m.neto)} ${m.neto === -1 ? 'persona' : 'personas'}: pasó de ${fmtNum(m.hcInicio)} a ${fmtNum(m.hcCierre)}.`);
  }
  if (por('rotacion') && !m.sdHc) {
    const e = est('rotacion');
    if (e === 'ok') bien.push(`La rotación (${fmtDec(m.tasaRot)} %) está en un nivel saludable.`);
    else vigilar.push(`La rotación es de ${fmtDec(m.tasaRot)} %: supera el 3 % que se considera saludable.`);
    if (m.porTipo.evitable > 0) sigue.push(m.porTipo.evitable === 1 ? 'Revisar el retiro evitable y definir acciones de retención.' : `Revisar los ${fmtNum(m.porTipo.evitable)} retiros evitables y definir acciones de retención.`);
    if (m.porTipo.critico > 0) sigue.push(`Reforzar el acompañamiento en los primeros días: hubo ${m.porTipo.critico === 1 ? 'un retiro por abandono' : fmtNum(m.porTipo.critico) + ' retiros por abandono'}.`);
  }
  if (por('sst')) {
    if (m.at === 0) bien.push('No hubo accidentes de trabajo en el mes.');
    else vigilar.push(`Hubo ${fmtNum(m.at)} ${m.at === 1 ? 'accidente de trabajo' : 'accidentes de trabajo'}: conviene revisar qué lo causó y cómo evitarlo.`);
    if (m.casos > 0) sigue.push(`Dar seguimiento a ${fmtNum(m.casos)} ${m.casos === 1 ? 'caso médico' : 'casos médicos'} hasta su cierre.`);
  }
  if (por('sst_tasa') && !por('sst_tasa').sinDatos) {
    if (est('sst_tasa') === 'ok') bien.push(`La tasa de accidentalidad es de ${fmtDec(m.tasaAT)} %, dentro de la meta de 1 %.`);
    else vigilar.push(`La tasa de accidentalidad es de ${fmtDec(m.tasaAT)} %, por encima de la meta de 1 %.`);
    const peor = m.sedes.filter(x => x.tasa != null && x.tasa > METAS.tasaAT.ok && x.sede.toLowerCase() !== 'nacional');
    peor.forEach(x => sigue.push(`Revisar los controles de seguridad en la sede ${x.sede} (tasa de ${fmtDec(x.tasa)} %).`));
  }
  if (por('sst_severidad')) {
    if (m.sevDias === 0) bien.push('No se perdieron días de trabajo por accidentes.');
    else vigilar.push(`Los accidentes dejaron ${fmtNum(m.sevDias)} ${m.sevDias === 1 ? 'día perdido' : 'días perdidos'} de trabajo.`);
  }
  if (por('sst_investigacion') && m.invTotal > 0) {
    if (est('sst_investigacion') === 'ok') bien.push('Todos los accidentes del mes ya fueron investigados.');
    else { vigilar.push(`Faltan por investigar ${fmtNum(m.invTotal - m.invHechos)} de ${fmtNum(m.invTotal)} accidentes.`); sigue.push('Completar la investigación de los accidentes pendientes dentro del plazo de 15 días.'); }
  }
  if (por('nomina')) {
    if (m.nerr === 0) bien.push(m.nliq > 0 ? `Nómina sin errores en ${fmtNum(m.nliq)} liquidaciones.` : 'Nómina sin errores reportados.');
    else { vigilar.push(`Se encontraron ${fmtNum(m.nerr)} ${m.nerr === 1 ? 'error' : 'errores'} en la liquidación de nómina.`); sigue.push('Verificar y reprocesar los errores de nómina.'); }
  }
  if (por('ausentismo')) {
    if (est('ausentismo') === 'ok') bien.push(`El ausentismo (${fmtDec(m.ausTasa)} %) está dentro de la meta.`);
    else vigilar.push(`El ausentismo es de ${fmtDec(m.ausTasa)} %, por encima de la meta del 2 %.`);
    if (extras.ausentismo?.obs) sigue.push(String(extras.ausentismo.obs));
  }
  if (por('clima') && !por('clima').sinDatos) {
    if (est('clima') === 'ok') bien.push(`La satisfacción del personal está en ${fmtNum(m.satisfaccion)} %, por encima de la meta.`);
    else vigilar.push(`La satisfacción del personal está en ${fmtNum(m.satisfaccion)} %, por debajo de la meta del 85 %.`);
    if (extras.clima?.plan) sigue.push(String(extras.clima.plan));
  }
  if (por('capacitacion') && m.capHoras > 0) bien.push(`Se dieron ${fmtNum(m.capHoras)} horas de formación a ${fmtNum(m.capPersonas)} ${m.capPersonas === 1 ? 'persona' : 'personas'}.`);
  if (por('facturacion') && !por('facturacion').sinDatos) {
    if (m.facEstado === 'Al día') bien.push('La facturación está al día.');
    else vigilar.push(`La facturación figura como "${m.facEstado}".`);
  }

  if (prev) {
    const mejor = indicadores.filter(i => i.delta?.tono === 'ok').map(i => i.nombre.toLowerCase());
    const peor = indicadores.filter(i => i.delta?.tono === 'bad').map(i => i.nombre.toLowerCase());
    if (mejor.length) bien.push(`Mejoraron frente a ${nombrePeriodo(prev.per)}: ${mejor.join(', ')}.`);
    if (peor.length) vigilar.push(`Empeoraron frente a ${nombrePeriodo(prev.per)}: ${peor.join(', ')}.`);
  }
  if (!sigue.length) sigue.push('Mantener el seguimiento mensual y documentar lo que funcionó para repetirlo.');
  return { bien, vigilar, sigue };
}

/** Conteo de semáforos para el titular del resumen. */
export function contarSemaforos(indicadores) {
  const c = { ok: 0, warn: 0, bad: 0, info: 0 };
  indicadores.forEach(i => { c[i.estado] = (c[i.estado] || 0) + 1; });
  return c;
}

/** Explicación didáctica por módulo: pregunta guía, qué es, cómo se calcula y cómo leerlo. */
export const EXPLICA = {
  seleccion: {
    pregunta: '¿Estamos cubriendo a tiempo las vacantes que pide la empresa?',
    que: 'Compara las vacantes que pidió el cliente (los requerimientos o RQ) con las que Proservis ya cubrió con una persona contratada.',
    formula: 'Efectividad = vacantes contratadas ÷ vacantes solicitadas × 100',
    leer: '80 % o más es la meta. Entre 50 % y 79 % hay que acelerar. Menos de 50 % es crítico y necesita atención inmediata.',
  },
  headcount: {
    pregunta: '¿Cuántas personas tenemos y cómo se movió la planta este mes?',
    que: 'Cuenta las personas activas al inicio del mes, las que ingresaron, las que se retiraron y las que quedaron al cierre.',
    formula: 'Activos al cierre = activos al inicio + ingresos − retiros',
    leer: 'Si el cierre es mayor que el inicio, la planta creció. Si es menor, perdió personas: conviene mirar la rotación para entender por qué.',
  },
  rotacion: {
    pregunta: '¿Por qué se están yendo las personas?',
    que: 'Muestra cuántas personas se retiraron y por qué motivo. Los motivos se agrupan para saber cuáles se pueden evitar.',
    formula: 'Rotación = retiros del mes ÷ activos al cierre × 100',
    leer: 'Hasta 3 % es saludable, entre 3 % y 6 % pide atención y más de 6 % es alta. "Estructural" es el fin de una obra o labor; "evitable" son motivos que la empresa puede influir; "crítico" es abandono del puesto.',
  },
  sst: {
    pregunta: '¿Estamos cuidando la seguridad y la salud de las personas?',
    que: 'Reúne los accidentes de trabajo (AT), los eventos de origen común o de tránsito (OC), las licencias de maternidad, los días perdidos por enfermedad general y los casos médicos en seguimiento. Se reporta según el Decreto 1072 de 2015.',
    formula: 'Tasa de accidentalidad = accidentes de trabajo ÷ personas expuestas × 100',
    leer: 'La meta es cero accidentes. Un solo accidente ya merece revisión; si hay varios, hay que cambiar algo en los controles.',
  },
  sst_tasa: {
    pregunta: '¿Qué tan seguido ocurren accidentes frente a las personas que trabajan?',
    que: 'Compara los accidentes de trabajo con el número de personas expuestas (las que estaban trabajando). Se muestra por sede para saber dónde ocurren.',
    formula: 'Tasa = accidentes de trabajo ÷ personas expuestas × 100',
    leer: 'Hasta 1 % está dentro de la meta, entre 1 % y 3 % pide atención y más de 3 % es crítico. «Nacional» es el total de la empresa.',
  },
  sst_severidad: {
    pregunta: '¿Qué tan graves fueron los accidentes?',
    que: 'Suma los días de trabajo que se perdieron por incapacidades de accidentes de trabajo y cuenta cuántos accidentes dejaron incapacidad.',
    formula: 'Días promedio = días perdidos ÷ accidentes que dejaron incapacidad',
    leer: 'La meta es cero días perdidos. Un accidente con muchos días de incapacidad es más grave que varios con pocos días.',
  },
  sst_investigacion: {
    pregunta: '¿Estamos aprendiendo de cada accidente?',
    que: 'Cada accidente de trabajo debe investigarse para entender su causa y evitar que se repita. Aquí se ve cuántos ya se investigaron y cuántos se hicieron dentro del plazo de 15 días.',
    formula: 'Cumplimiento = accidentes investigados ÷ accidentes por investigar × 100',
    leer: 'La meta es 100 %. Entre 80 % y 99 % hay que cerrar los pendientes; menos de 80 % es crítico.',
  },
  nomina: {
    pregunta: '¿La nómina se está liquidando bien y a tiempo?',
    que: 'Resume cuántas personas se liquidaron, cuántas incapacidades y licencias hubo, las horas extras y los errores que se corrigieron.',
    formula: '',
    leer: 'El objetivo es cero errores. Las horas extras altas pueden indicar exceso de carga de trabajo.',
  },
  ausentismo: {
    pregunta: '¿Cuánto tiempo de trabajo se está perdiendo por ausencias?',
    que: 'Mide el tiempo de trabajo programado que no se cumplió por incapacidades, permisos, licencias u otras ausencias.',
    formula: 'Tasa de ausentismo = tiempo de ausencia ÷ tiempo programado × 100',
    leer: 'Hasta 2 % está dentro de la meta, entre 2 % y 4 % pide atención y más de 4 % es crítico.',
  },
  capacitacion: {
    pregunta: '¿Estamos formando a las personas?',
    que: 'Cuenta las horas de formación dadas, cuántas personas participaron y qué temas se vieron.',
    formula: 'Cobertura = personas capacitadas ÷ total de personas × 100',
    leer: 'Más horas y más cobertura significan que más personas están recibiendo entrenamiento. Lo ideal es que la cobertura crezca mes a mes.',
  },
  clima: {
    pregunta: '¿Cómo se sienten las personas en su trabajo?',
    que: 'Resume la encuesta de clima: qué tan satisfechas están, cuántas la contestaron y qué tan dispuestas estarían a recomendar la empresa (eNPS).',
    formula: 'eNPS = % de promotores − % de detractores',
    leer: 'La satisfacción de 85 % o más es la meta. El eNPS va de −100 a +100: sobre 0 es positivo y sobre 30 es muy bueno.',
  },
  facturacion: {
    pregunta: '¿Cómo van los números del servicio?',
    que: 'Muestra lo facturado en el mes, el costo de nómina, el margen y qué tan al día están los pagos.',
    formula: 'Margen = (valor facturado − costo) ÷ valor facturado × 100',
    leer: '"Al día" significa que no hay pagos vencidos. Los días de cartera indican cuánto tarda en promedio el cobro.',
  },
};

/** Glosario del final del reporte: solo las palabras de los módulos que van en este informe. */
export const GLOSARIO = [
  { mod: 'seleccion', t: 'RQ (requerimiento)', d: 'Una solicitud de vacante que hace la empresa cliente a Proservis.' },
  { mod: 'headcount', t: 'Headcount', d: 'Número de personas activas en la planta en un momento dado.' },
  { mod: 'rotacion', t: 'Rotación', d: 'Proporción de personas que se retiran de la planta en un período.' },
  { mod: 'sst', t: 'AT (accidente de trabajo)', d: 'Accidente que le ocurre a una persona por causa o con ocasión de su trabajo.' },
  { mod: 'sst', t: 'OC (origen común)', d: 'Evento de salud o de tránsito que no es del trabajo.' },
  { mod: 'sst', t: 'E.G. (enfermedad general)', d: 'Incapacidad por una enfermedad que no es laboral. Se mide en días perdidos.' },
  { mod: 'sst', t: 'ARL', d: 'Administradora de Riesgos Laborales: el seguro que cubre accidentes y enfermedades del trabajo.' },
  { mod: 'sst', t: 'CIE-10', d: 'Código internacional que identifica un diagnóstico médico.' },
  { mod: 'sst_tasa', t: 'Personas expuestas', d: 'Personas que estaban trabajando y, por lo tanto, podían sufrir un accidente en el período.' },
  { mod: 'sst_severidad', t: 'Día perdido', d: 'Día de trabajo que una persona no pudo laborar por incapacidad de un accidente de trabajo.' },
  { mod: 'sst_investigacion', t: 'Investigación de AT', d: 'Análisis de las causas de un accidente para evitar que se repita. Debe hacerse dentro de 15 días.' },
  { mod: 'sst', t: 'ISSA', d: 'Archivo de indicadores de seguridad y salud en el trabajo con el que se alimentan estas cifras.' },
  { mod: 'clima', t: 'eNPS', d: 'Mide cuántas personas recomendarían la empresa como lugar de trabajo: promotores menos detractores.' },
  { mod: 'ausentismo', t: 'Ausentismo', d: 'Tiempo de trabajo programado que no se cumplió por ausencias.' },
  { mod: 'facturacion', t: 'Cartera', d: 'Facturas emitidas que todavía no se han pagado. Se mide en días promedio de cobro.' },
  { mod: 'capacitacion', t: 'Cobertura', d: 'Porcentaje de las personas que recibió al menos una formación.' },
];

export function glosarioDe(active) {
  return GLOSARIO.filter(g => activo(active, g.mod));
}

export { activo as moduloActivo, any as algunModulo };
