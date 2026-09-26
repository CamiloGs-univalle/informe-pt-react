/**
 * cleanupAndSeed.js
 * ─────────────────────────────────────────────────────────────────────────
 * COMPLETE WIPE + SEED: Borra TODO en Firestore y deja SOLO al Super Admin
 * 
 * EJECUTAR EN CONSOLA DEL NAVEGADOR (F12) EN LA APP:
 *   import('./scripts/cleanupAndSeed.js').then(m => m.cleanupAndSeed())
 * 
 * O DESDE Node si tienes firebase-admin configurado
 */

import { db } from '../config/firebase';
import { 
  collection, getDocs, deleteDoc, doc, writeBatch, setDoc, serverTimestamp 
} from 'firebase/firestore';

const SUPER_ADMIN_EMAIL = 'auxiliar.ti@proservis.com.co';
const SUPER_ADMIN_NAME = 'Camilo Garcia';

const COLLECTIONS = [
  'ejecutivos',
  'clientes', 
  'informes',
  'workspaces',
  'areas',
  'contribuciones',
  'moduloConfigs'
];

export async function cleanupAndSeed() {
  console.log('🧹 INICIANDO LIMPIEZA COMPLETA...');
  console.log('⚠️  ESTO BORRARÁ TODOS LOS DATOS EN FIRESTORE');
  
  const failedCollections = [];
  
  try {
    // 1. BORRAR TODAS LAS COLECCIONES
    for (const collName of COLLECTIONS) {
      console.log(`\n📁 Borrando colección: ${collName}...`);
      const snap = await getDocs(collection(db, collName));
      console.log(`   Documentos encontrados: ${snap.size}`);
      
      if (snap.size === 0) {
        console.log(`   ✅ Ya está vacía`);
        continue;
      }
      
      // Borrar en batches de 500 (límite Firestore)
      let batch = writeBatch(db);
      let count = 0;
      let hasErrors = false;
      
      for (const document of snap.docs) {
        try {
          batch.delete(doc(db, collName, document.id));
          count++;
          
          if (count % 500 === 0) {
            await batch.commit();
            console.log(`   📦 Batch de ${count} borrado...`);
            batch = writeBatch(db);
          }
        } catch (err) {
          hasErrors = true;
          console.error(`   ❌ Error borrando ${document.id}:`, err.message);
        }
      }
      
      if (count % 500 !== 0) {
        try {
          await batch.commit();
        } catch (err) {
          hasErrors = true;
          console.error(`   ❌ Error en commit final:`, err.message);
        }
      }
      
      if (hasErrors) {
        failedCollections.push({ name: collName, deleted: count, total: snap.size });
        console.log(`   ⚠️ ${collName}: ${count}/${snap.size} borrados (algunos fallaron)`);
      } else {
        console.log(`   ✅ ${collName}: ${count} documentos borrados`);
      }
    }
    
    // 2. LIMPIAR LOCALSTORAGE
    console.log('\n💾 Limpiando localStorage...');
    localStorage.removeItem('ps_v3');
    localStorage.removeItem('ps_auth_user');
    localStorage.removeItem('ps_ej_activo');
    console.log('   ✅ localStorage limpio');
    
    // 3. CREAR SUPER ADMIN EN FIRESTORE
    console.log('\n👑 Creando Super Admin...');
    const superAdminId = 'e_super_admin_' + Date.now();
    
    await setDoc(doc(db, 'ejecutivos', superAdminId), {
      nom: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      role: 'super_admin',
      activo: true,
      workspaceId: 'w1',
      areaId: 'a1',
      password: 'Proservis2026', // Para fallback local
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`   ✅ Super Admin creado: ${SUPER_ADMIN_EMAIL} (ID: ${superAdminId})`);
    
    // 4. CREAR WORKSPACE Y ÁREAS BÁSICAS
    console.log('\n🏢 Creando workspace y áreas base...');
    
    const workspaceId = 'w1';
    await setDoc(doc(db, 'workspaces', workspaceId), {
      nombre: 'Proservis Temporales',
      descripcion: 'Workspace principal',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const areas = [
      { id: 'a1', nombre: 'Selección', descripcion: 'Área de Selección y Psicología', workspaceId, adminId: null, modulos: [] },
      { id: 'a2', nombre: 'SST', descripcion: 'Seguridad y Salud en el Trabajo', workspaceId, adminId: null, modulos: [] },
      { id: 'a3', nombre: 'Administración', descripcion: 'Administración y Operaciones', workspaceId, adminId: superAdminId, modulos: [] }
    ];
    
    for (const area of areas) {
      await setDoc(doc(db, 'areas', area.id), {
        ...area,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(`   ✅ Workspace + ${areas.length} áreas creadas`);
    
    // 5. CONFIGURACIÓN MÓDULOS GLOBAL (TODO ACTIVO)
    console.log('\n⚙️ Creando config de módulos global...');
    const MODULOS = [
      'headcount', 'seleccion', 'rotacion', 'sst', 'sst_tasa', 
      'sst_severidad', 'sst_investigacion', 'nomina', 'ausentismo',
      'capacitacion', 'clima', 'facturacion', 'fotos'
    ];
    
    const globalConfig = {};
    MODULOS.forEach(m => { globalConfig[m] = true; });
    
    await setDoc(doc(db, 'moduloConfigs', 'global'), {
      ...globalConfig,
      updatedAt: serverTimestamp()
    });
    
    // Config para super_admin
    await setDoc(doc(db, 'moduloConfigs', superAdminId), {
      ...globalConfig,
      updatedAt: serverTimestamp()
    });
    
    console.log('   ✅ Config módulos global + super_admin creada');
    
    console.log('\n🎉 ¡LIMPIEZA Y SEED COMPLETADOS!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN:');
    console.log('   ✅ localStorage limpiado');
    
    if (failedCollections.length > 0) {
      console.log('   ⚠️ Colecciones con errores de permisos:');
      failedCollections.forEach(fc => {
        console.log(`      - ${fc.name}: ${fc.deleted}/${fc.total} borrados`);
      });
      console.log('\n   🔧 SOLUCIÓN MANUAL REQUERIDA:');
      console.log('   1. Abre Firebase Console: https://console.firebase.google.com/project/reportes-pt-ejecutivos/firestore/data');
      console.log('   2. Para cada colección fallida, selecciona todos los documentos y bórralos manualmente');
      console.log('   3. O actualiza las reglas de Firestore para permitir delete a super_admin');
    } else {
      console.log('   ✅ Todas las colecciones borradas');
    }
    
    console.log(`   ✅ Super Admin: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   ✅ Nombre: ${SUPER_ADMIN_NAME}`);
    console.log('   ✅ Rol: super_admin');
    console.log('   ✅ Workspace: Proservis Temporales (w1)');
    console.log('   ✅ Áreas: Selección (a1), SST (a2), Administración (a3)');
    console.log('   ✅ Módulos: Todos activados (14)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔄 RECARGUE LA PÁGINA (F5) Y HAGA LOGIN');
    console.log('   Email: auxiliar.ti@proservis.com.co');
    console.log('   Password: Proservis2026');
    console.log('   O use "Iniciar sesión con Google" con esa cuenta');
    
    return { success: true, superAdminId, failedCollections };
    
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  }
}

// También exportar función solo de limpieza (sin seed)
export async function onlyCleanup() {
  console.log('🧹 SOLO LIMPIEZA (sin seed)...');
  
  const failedCollections = [];
  
  for (const collName of COLLECTIONS) {
    const snap = await getDocs(collection(db, collName));
    if (snap.size === 0) continue;
    
    let batch = writeBatch(db);
    let count = 0;
    let hasErrors = false;
    
    for (const document of snap.docs) {
      try {
        batch.delete(doc(db, collName, document.id));
        count++;
        if (count % 500 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      } catch (err) {
        hasErrors = true;
        console.error(`   ❌ Error borrando ${document.id}:`, err.message);
      }
    }
    
    if (count % 500 !== 0) {
      try {
        await batch.commit();
      } catch (err) {
        hasErrors = true;
        console.error(`   ❌ Error en commit final:`, err.message);
      }
    }
    
    if (hasErrors) {
      failedCollections.push({ name: collName, deleted: count, total: snap.size });
      console.log(`   ⚠️ ${collName}: ${count}/${snap.size} borrados (algunos fallaron)`);
    } else {
      console.log(`   ✅ ${collName}: ${count} borrados`);
    }
  }
  
  localStorage.removeItem('ps_v3');
  localStorage.removeItem('ps_auth_user');
  localStorage.removeItem('ps_ej_activo');
  
  if (failedCollections.length > 0) {
    console.log('\n⚠️ Colecciones con errores de permisos (borrar manualmente en Firebase Console):');
    failedCollections.forEach(fc => console.log(`   - ${fc.name}: ${fc.deleted}/${fc.total}`));
  }
  
  console.log('✅ Limpieza completa sin seed');
  return { success: true, failedCollections };
}

// Auto-ejecutar si se llama directo en consola
if (typeof window !== 'undefined') {
  window.cleanupAndSeed = cleanupAndSeed;
  window.onlyCleanup = onlyCleanup;
  console.log('📋 Funciones disponibles en window:');
  console.log('   window.cleanupAndSeed()  → Borra todo + crea Super Admin');
  console.log('   window.onlyCleanup()     → Solo borra todo');
}