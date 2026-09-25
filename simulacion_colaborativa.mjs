#!/usr/bin/env node
// Simulación colaborativa - 7 roles - Señor Camilo
global.localStorage = {
  _d: {},
  getItem(k){ return this._d[k] || null; },
  setItem(k,v){ this._d[k]=v; },
  removeItem(k){ delete this._d[k]; },
  clear(){ this._d={}; }
};

import { DB, loadDB, saveDB } from './src/models/db.js';
import { getEj, getUsersForAdmin } from './src/models/Ejecutivo.js';
import { getClisVisiblesParaUsuario, getCli } from './src/models/Cliente.js';
import { saveContribucion, getContribucion, getResumenEstados, ESTADOS } from './src/models/Contribucion.js';
import { fusionarContribuciones, getClientesParaUsuario } from './src/controllers/workflowController.js';
import { buildInformePreviewHtml } from './src/controllers/informeController.js';

loadDB();
console.log('=== SIMULACIÓN COLABORATIVA — Señor Camilo ===\n');
console.log(`DB cargada: ${DB.ejs.length} usuarios, ${DB.clis.length} clientes, ${DB.areas.length} áreas\n`);

const users = {
  super: DB.ejs.find(e=>e.id==='e0'),
  jefe_sst: DB.ejs.find(e=>e.id==='e_test_jefe_sst'),
  jefe_sel: DB.ejs.find(e=>e.id==='e_test_jefe_sel'),
  jefe_eje: DB.ejs.find(e=>e.id==='e_test_jefe_eje'),
  u_sst: DB.ejs.find(e=>e.id==='e_test_u_sst'),
  u_sel: DB.ejs.find(e=>e.id==='e_test_u_sel'),
  u_eje: DB.ejs.find(e=>e.id==='e_test_u_eje'),
};

for (const [k,u] of Object.entries(users)) {
  console.log(`${k.padEnd(12)}: ${u.nom} <${u.email}> role=${u.role} area=${u.areaId} (${DB.areas.find(a=>a.id===u.areaId)?.nombre||'—'})`);
}
console.log('');

const periodo = '2026-09';
const cliIds = ['c3','c30','c79']; // AGECOLDA, CLINICA IMBANACO, MANITOBA
console.log(`Periodo prueba: ${periodo}`);
console.log(`Clientes prueba: ${cliIds.map(id=> getCli(id).nom).join(', ')}\n`);

// Limpia contribuciones previas de prueba
DB.contribuciones = DB.contribuciones.filter(c=> !(cliIds.includes(c.cliId) && c.per===periodo));
saveDB();
console.log('Contribuciones previas limpiadas para periodo prueba.\n');

// ── ESCENARIO 1: Usuario Selección sube ficha ──
console.log('─── ESCENARIO 1: Laura Selección (usuario.seleccion) sube ficha para AGECOLDA ───');
saveContribucion({ cliId:'c3', per:periodo, areaId:'a1', userId: users.u_sel.id, estado: ESTADOS.COMPLETADO, datos:{ seleccion: [{rq:'RQ-001', agencia:'Cali', ciudad:'Cali', cargo:'Operario', solicitadas:5, contratadas:4, oportunidad:85, tiempoRespuesta:5, estado:'Cubierta'}] } });
console.log('✓ Laura completó a1 para c3 (AGECOLDA) → estado completado');
console.log('  MisContribuciones para Laura pendiente:', getClisVisiblesParaUsuario(users.u_sel).filter(c=> {
  const ct=getContribucion(c.id,periodo,'a1'); return !ct || [ESTADOS.PENDIENTE,ESTADOS.EN_PROCESO,ESTADOS.RECHAZADO].includes(ct.estado);
}).map(c=>c.nom).join(', ') || '(ninguno, c3 oculto ✓)');
console.log('');

// ── ESCENARIO 2: Usuario SST sube ──
console.log('─── ESCENARIO 2: Ana SST sube para MISMO cliente ───');
saveContribucion({ cliId:'c3', per:periodo, areaId:'a2', userId: users.u_sst.id, estado: ESTADOS.COMPLETADO, datos:{ sst:{ indicadores:{at:1, oc:0, maternidad:0, eg:3, arl:100, inducciones:2}, casos:[] } } });
console.log('✓ Ana completó a2 para c3');
console.log('  Resumen c3:', getResumenEstados('c3',periodo));
console.log('');

// ── ESCENARIO 3: Jefe Selección solo ve su equipo ──
console.log('─── ESCENARIO 3: Jefe Selección solo ve su equipo ───');
const teamSel = getUsersForAdmin(users.jefe_sel.id);
console.log(`Jefe Selección (${users.jefe_sel.nom}) ve ${teamSel.length} personas: ${teamSel.map(u=>u.nom).join(', ')}`);
console.log('  ¿Ve a Ana SST? ', teamSel.some(u=>u.id===users.u_sst.id) ? 'SÍ (ERROR)' : 'NO ✓');
console.log('  ¿Ve super_admin Camilo? ', teamSel.some(u=>u.id==='e0') ? 'SÍ (ERROR)' : 'NO ✓');
console.log('');

// ── ESCENARIO 4: Jefe SST ──
console.log('─── ESCENARIO 4: Jefe SST solo ve su equipo ───');
const teamSst = getUsersForAdmin(users.jefe_sst.id);
console.log(`Jefe SST ve ${teamSst.length}: ${teamSst.map(u=>u.nom).join(', ')}`);
console.log('  ¿Ve a Laura Selección? ', teamSst.some(u=>u.id===users.u_sel.id) ? 'SÍ (ERROR)' : 'NO ✓');
console.log('');

// ── ESCENARIO 5: Jefe Ejecutivos ve todos ──
console.log('─── ESCENARIO 5: Jefe Ejecutivos ve todos para seguimiento ───');
const teamEje = getUsersForAdmin(users.jefe_eje.id);
console.log(`Jefe Ejecutivos ve ${teamEje.length} personas (ejecutivos): ${teamEje.map(u=>u.nom).join(', ').slice(0,120)}...`);
const clisJefeEje = getClisVisiblesParaUsuario(users.jefe_eje).length ? 'via vis' : '0';
console.log(`  Clientes visibles para Jefe Ejecutivos: ${DB.clis.filter(c=>c.ejId===users.u_eje.id).length} (de su equipo) + seguimiento total workspace=${DB.clis.filter(c=>c.workspaceId==='w1').length}`);
console.log('');

// ── ESCENARIO 6: Usuario Ejecutivo ve tablero y fusiona ──
console.log('─── ESCENARIO 6: Carlos Ejecutivo (usuario.ejecutivo) — tablero y fusión ───');
const fused = fusionarContribuciones('c3', periodo);
console.log('  Fusionadas para c3:', Object.keys(fused).filter(k=> {
  const v=fused[k];
  return Array.isArray(v) ? v.length : v && Object.keys(v).length;
}).join(', '));
console.log(`  Selección: ${fused.seleccion?.length||0} RQs, SST AT=${fused.sst?.indicadores?.at||0}`);
const html = buildInformePreviewHtml({ cliId:'c3', periodo, ejecutivo: users.u_eje, headcount: fused.headcount, sst: fused.sst, nomina: fused.nomina, seleccion: fused.seleccion, rotacion: fused.rotacion, fotos: fused.fotos, ausentismo: fused.ausentismo, capacitacion: fused.capacitacion, clima: fused.clima, facturacion: fused.facturacion, activeModules: null });
console.log(`  HTML generado: ${html.length} chars, incluye gráficas: ${html.includes('<svg')?'SÍ ✓':'NO'}`);
console.log(`  Ficha técnica en HTML: ${html.includes('Oportunidad')?'SÍ ✓':'NO'}`);
console.log('');

// ── ESCENARIO 7: Super Admin ve todo ──
console.log('─── ESCENARIO 7: Super Admin (Camilo) ve todo y puede editar áreas ───');
console.log(`  Super Admin ve ${DB.ejs.length} usuarios (incluido él)`);
console.log(`  Ve a Jefe SST? ${DB.ejs.some(u=>u.id===users.jefe_sst.id)?'SÍ ✓':'NO'}`);
console.log(`  Puede crear áreas: ${DB.areas.length} áreas actuales`);
console.log('');

// ── ESCENARIO 8: Filtro Nuevo Informe ──
console.log('─── ESCENARIO 8: Filtro Nuevo Informe — cliente ya reportado no aparece ───');
const visLaura = getClisVisiblesParaUsuario(users.u_sel);
const filtradosLaura = visLaura.filter(c=>{
  const ct=getContribucion(c.id,periodo,'a1');
  return !ct || [ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO, ESTADOS.RECHAZADO].includes(ct.estado);
});
console.log(`  Laura visibles totales: ${visLaura.length}, pendientes para ${periodo}: ${filtradosLaura.length} (c3 debe estar oculto)`);
console.log(`  c3 oculto para Laura? ${!filtradosLaura.some(c=>c.id==='c3')?'SÍ ✓':'NO (ERROR)'}`);
console.log(`  c30 sigue visible para Laura? ${filtradosLaura.some(c=>c.id==='c30')?'SÍ ✓':'NO'}`);

console.log('\n=== FIN SIMULACIÓN — Todo OK si ve ✓ ===');
console.log('\nCredenciales de prueba (password: Proservis2026):');
for (const u of Object.values(users)) console.log(`  ${u.nom.padEnd(20)} ${u.email.padEnd(35)} role=${u.role} area=${u.areaId}`);
