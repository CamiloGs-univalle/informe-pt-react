/**
 * template.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Genera plantillas Excel descargables por área — guía real de lo que
 * necesita el sistema para subir datos rápido y sin errores.
 */
import * as XLSX from 'xlsx';

function downloadWorkbook(wb, fileName) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

export function downloadPlantillaSeleccion() {
  const wb = XLSX.utils.book_new();
  const headers = ['RQ PT', 'Agencia', 'Ciudad', 'Cargo', 'Solicitadas', 'Contratadas', 'Oportunidad %', 'Tiempo Respuesta (días)', 'Estado', 'Nota'];
  const ejemplo = [
    ['RQ-001', 'Cali', 'Cali', 'Operario', 5, 4, 80, 6, 'Cubierta', ''],
    ['RQ-002', 'Bogotá', 'Bogotá', 'Auxiliar', 3, 1, 40, 12, 'Activa', 'Pendiente 2'],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo]);
  ws['!cols'] = headers.map(()=>({wch:16}));
  // Estilo cabecera (si xlsx lo permite, solo colores básicos)
  XLSX.utils.book_append_sheet(wb, ws, 'Selección');
  // Hoja guía
  const guia = [
    ['FICHA TÉCNICA SELECCIÓN — 4 indicadores'],
    [''],
    ['Columna', 'Qué poner', 'Ejemplo'],
    ['RQ PT', 'Código del requerimiento', 'RQ-001'],
    ['Solicitadas', 'Vacantes solicitadas (número)', '5'],
    ['Contratadas', 'Vacantes cubiertas', '4'],
    ['Oportunidad %', 'Cobertura a tiempo %', '80'],
    ['Tiempo Respuesta', 'Días promedio para cubrir', '6'],
    ['Vacantes activas', 'Se calcula: Solicitadas - Contratadas', '1'],
    ['Efectividad', 'Se calcula: Contratadas/Solicitadas %', '80%'],
    [''],
    ['Los 4 indicadores se calculan automático en la ficha, pero Oportunidad y Tiempo se toman por RQ.'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(guia);
  ws2['!cols'] = [{wch:22},{wch:40},{wch:18}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Guía');
  downloadWorkbook(wb, 'Plantilla_Seleccion_Ficha_Tecnica.xlsx');
}

export function downloadPlantillaSST() {
  // Plantilla EXACTA que ya usa SST (ISSA 2026) — fuente real del informe
  const a = document.createElement('a');
  a.href = '/plantillas/Plantilla_SST_ISSA_2026.xlsx';
  a.download = 'Plantilla_SST_ISSA_2026.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadPlantillaHeadcount() {
  const wb = XLSX.utils.book_new();
  const headers = ['Activos inicio', 'Ingresos', 'Retiros'];
  const ejemplo = [[50, 5, 3]];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo]);
  ws['!cols'] = headers.map(()=>({wch:16}));
  XLSX.utils.book_append_sheet(wb, ws, 'Headcount');
  downloadWorkbook(wb, 'Plantilla_Headcount.xlsx');
}

export function downloadPlantillaAusentismo() {
  const wb = XLSX.utils.book_new();
  const headers = ['Horas ausencia', 'Eventos', 'Tasa %', 'Días perdidos', 'Principales causas', 'Plan acción'];
  const ejemplo = [[120, 4, 2.5, 10, 'Gripa, Lumbalgia', 'Pausas activas']];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo]);
  ws['!cols'] = [{wch:14},{wch:10},{wch:8},{wch:12},{wch:22},{wch:22}];
  XLSX.utils.book_append_sheet(wb, ws, 'Ausentismo');
  downloadWorkbook(wb, 'Plantilla_Ausentismo.xlsx');
}

export function downloadPlantillaCompleta() {
  const wb = XLSX.utils.book_new();
  // Reusa las mismas hojas en un solo libro
  const selH = ['RQ PT', 'Agencia', 'Ciudad', 'Cargo', 'Solicitadas', 'Contratadas', 'Oportunidad %', 'Tiempo Respuesta (días)', 'Estado', 'Nota'];
  const selE = [['RQ-001', 'Cali', 'Cali', 'Operario', 5, 4, 80, 6, 'Cubierta', '']];
  const ws1 = XLSX.utils.aoa_to_sheet([selH, ...selE]); ws1['!cols']=selH.map(()=>({wch:14})); XLSX.utils.book_append_sheet(wb, ws1, 'Selección');
  const sstH = ['AT', 'OC', 'Maternidad', 'EG', 'ARL', 'Inducciones']; const sstE=[[1,0,0,5,100,3]];
  const ws2 = XLSX.utils.aoa_to_sheet([sstH, ...sstE]); XLSX.utils.book_append_sheet(wb, ws2, 'SST');
  const hcH=['Activos inicio','Ingresos','Retiros']; const hcE=[[50,5,3]];
  const ws3 = XLSX.utils.aoa_to_sheet([hcH, ...hcE]); XLSX.utils.book_append_sheet(wb, ws3, 'Headcount');
  downloadWorkbook(wb, 'Plantilla_Completa_Todas_Las_Areas.xlsx');
}
