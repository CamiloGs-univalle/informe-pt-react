/*
 * EXPORTAR DATOS REALES DE INFORME PT → archivo para migrar a Firestore
 * ─────────────────────────────────────────────────────────────────────
 * INSTRUCCIONES:
 * 1. Abre tu navegador normal (Chrome/Edge) en http://localhost:5173
 *    (el mismo navegador donde usas la app todos los días).
 * 2. Presiona F12 para abrir las herramientas de desarrollador.
 * 3. Ve a la pestaña "Console".
 * 4. Pega TODO este archivo y presiona Enter.
 * 5. Se descargará un archivo llamado "ps_v3-export.json".
 * 6. Guárdalo (o muévelo) dentro de la carpeta del proyecto:
 *    C:\Users\administrator\Documents\GitHub\informe-pt-react\ps_v3-export.json
 * 7. Avísame cuando esté ahí para continuar con la migración a Firebase.
 */
(function () {
  const raw = localStorage.getItem('ps_v3');
  if (!raw) {
    console.error('No se encontró localStorage["ps_v3"]. ¿Estás en localhost:5173 y ya iniciaste sesión al menos una vez?');
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('El contenido de ps_v3 no es JSON válido:', e);
    return;
  }

  const resumen = {
    ejecutivos: (parsed.ejs || []).length,
    clientes: (parsed.clis || []).length,
    informes: (parsed.infs || []).length,
    workspaces: (parsed.workspaces || []).length,
    areas: (parsed.areas || []).length,
    contribuciones: (parsed.contribuciones || []).length,
  };
  console.log('%cResumen de datos a exportar:', 'font-weight:bold;color:#168A43', resumen);

  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ps_v3-export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log('%c✔ Descarga iniciada: ps_v3-export.json — muévelo a la carpeta del proyecto.', 'font-weight:bold;color:#168A43');
})();
