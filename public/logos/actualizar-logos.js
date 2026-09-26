/**
 * Script para actualizar logos de clientes en la base de datos
 * Ejecutar en la consola del navegador (F12 > Console) en la app
 */

// Mapa de NIT a archivo de logo
const logoMap = {
  '800024095': '800024095 - MANITOBA S.A.S..jpg',
  '800130144': '800130144 - BURICA S.A..jpg',
  '800196667': '800196667 - EMBOTELLADORA DE BEBIDAS DEL TOLIMA S.A..jpg',
  '805017279': '805017279 - AGRAF INDUSTRIAL S.A.S..jpg',
  '809009050': '809009050 - DISTRIBUCION Y TRANSPORTES S.A..jpg',
  '8221002693': '8221002693 - FEXTON S.A.S..jpg',
  '830033723': '830033723 - DERIVADOS LÁTEOS QBCO S.A.S..jpg',
  '890200474': '890200474 - GOODYEAR DE COLOMBIA S.A..jpg',
  '890300213': '890300213 - ALUMINIO NACIONAL S.A..jpg',
  '890303400': '890303400 - COMPAÑIA NACIONAL DE LEVADURAS LEVAPAN S.A..jpg',
  '890306215': '890306215 - CRUZ ROJA COLOMB SEC VALLE.jpg',
  '890306216': '890306216 - COOPERATIVA NACIONAL DE DROGUISTAS DETALLISTAS - COOPIDROGAS.jpg',
  '890306240': '890306240 - CAJAS COLOMBIANAS S.A.S..jpg',
  '890307200': '890307200 - CLINICA IMBANACO S.A.S..jpg',
  '890315540': '890315540 - PRODUCTOS YUPI S.A.S..jpg',
  '900017447': '900017447 - ESPEJOS S.A..jpg',
  '900158592': '900158592 - FONDO DE EMPLEADOS DE SERVICIOS - FONSER.jpg',
  '900233101': '900233101 - CEMENTOS SAN MARCOS S.A..jpg',
  '900317814': '900317814 - CENTRAL DE ABASTECIMIENTOS DEL VALLE DEL CAUCA S.A..jpg',
  '900378212': '900378212 - BANCO W S.A..jpg',
  '900429481': '900429481 - E.S.M. LOGISTICA S.A.S..jpg',
  '900984565': '900984565 - COORPORACION MUNCHY S.A.S..jpg',
  '901232631': '901232631 - FAREVA VILLA RICA S.A.S..jpg',
};

async function actualizarLogos() {
  // Obtener clientes del localStorage
  const storage = localStorage.getItem('ps_v3');
  if (!storage) {
    console.error('No hay datos en localStorage');
    return;
  }
  
  const data = JSON.parse(storage);
  const clientes = data.clis || [];
  
  console.log(`Clientes encontrados: ${clientes.length}`);
  
  let actualizados = 0;
  let noEncontrados = [];
  
  for (const cliente of clientes) {
    const nit = cliente.nit?.toString().replace(/\D/g, '');
    if (!nit) {
      console.log(`⚠️ Cliente sin NIT: ${cliente.nom}`);
      continue;
    }
    
    const logoFile = logoMap[nit];
    if (logoFile) {
      // Convertir imagen a base64
      try {
        const response = await fetch(`/logos/clientes/${logoFile}`);
        const blob = await response.blob();
        const base64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        
        cliente.logo = base64;
        actualizados++;
        console.log(`✅ ${cliente.nom} (NIT: ${nit}) - Logo actualizado`);
      } catch (e) {
        console.error(`❌ Error cargando logo para ${cliente.nom}:`, e);
      }
    } else {
      noEncontrados.push(`${cliente.nom} (NIT: ${nit})`);
    }
  }
  
  // Guardar en localStorage
  data.clis = clientes;
  localStorage.setItem('ps_v3', JSON.stringify(data));
  
  // Disparar evento para que la app se actualice
  window.dispatchEvent(new StorageEvent('storage', { 
    key: 'ps_v3', 
    newValue: JSON.stringify(data) 
  }));
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`  ✅ Actualizados: ${actualizados}`);
  console.log(`  ⚠️ Sin logo disponible: ${noEncontrados.length}`);
  if (noEncontrados.length > 0) {
    console.log('  Clientes sin logo:', noEncontrados);
  }
  
  console.log('\n🔄 Recarga la página para ver los cambios');
}

// Ejecutar
actualizarLogos();