/**
 * AdminData.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Administración de Datos: Limpieza total, Seed Super Admin, Carga Masiva
 * Solo visible para Super Admin
 */
import { useState } from 'react';
import { useToast } from '../common/useToast';
import { 
  CLIENTE_TEMPLATE_CSV, 
  EJECUTIVO_TEMPLATE_CSV,
  getClienteTemplateInfo,
  getEjecutivoTemplateInfo,
  downloadClienteTemplate,
  downloadEjecutivoTemplate,
  uploadClientesCSV,
  uploadEjecutivosCSV,
  parseCSV
} from '../../utils/massUpload';
import { cleanupAndSeed, onlyCleanup } from '../../scripts/cleanupAndSeed';
import { getEjs } from '../../models/Ejecutivo';
import { getClis } from '../../models/Cliente';
import { saveDB } from '../../models/db';

export default function AdminData({ user }) {
  const toast = useToast();
  const isSuper = user?.role === 'super_admin';
  
  // Limpieza
  const [cleanupConfirm, setCleanupConfirm] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  
  // Seed
  const [seedLoading, setSeedLoading] = useState(false);
  
  // Carga masiva clientes
  const [cliFile, setCliFile] = useState(null);
  const [cliPreview, setCliPreview] = useState(null);
  const [cliUploading, setCliUploading] = useState(false);
  const [cliResult, setCliResult] = useState(null);
  
  // Carga masiva ejecutivos
  const [ejFile, setEjFile] = useState(null);
  const [ejPreview, setEjPreview] = useState(null);
  const [ejUploading, setEjUploading] = useState(false);
  const [ejResult, setEjResult] = useState(null);

  const handleCliFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCliFile(file);
    setCliResult(null);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setCliPreview(parsed.slice(0, 5)); // Primeras 5 filas
      } catch (err) {
        toast('Error leyendo CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleEjFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEjFile(file);
    setEjResult(null);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target.result);
        setEjPreview(parsed.slice(0, 5));
      } catch (err) {
        toast('Error leyendo CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const uploadClientes = async () => {
    if (!cliFile) return toast('Seleccione un archivo CSV');
    setCliUploading(true);
    setCliResult(null);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const result = await uploadClientesCSV(ev.target.result, (prog) => {
          toast(`Procesando: ${prog.current} (${prog.created + prog.updated}/${prog.total})`);
        });
        setCliResult(result);
        if (result.success) {
          toast(`✅ ${result.created} creados, ${result.updated} actualizados`);
        } else {
          toast(`❌ Errores: ${result.errors.slice(0,3).join('; ')}`);
        }
      } catch (err) {
        toast('Error subiendo: ' + err.message);
        setCliResult({ success: false, errors: [err.message] });
      } finally {
        setCliUploading(false);
      }
    };
    reader.readAsText(cliFile);
  };

  const uploadEjecutivos = async () => {
    if (!ejFile) return toast('Seleccione un archivo CSV');
    setEjUploading(true);
    setEjResult(null);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const result = await uploadEjecutivosCSV(ev.target.result, (prog) => {
          toast(`Procesando: ${prog.current} (${prog.created + prog.updated}/${prog.total})`);
        });
        setEjResult(result);
        if (result.success) {
          toast(`✅ ${result.created} creados, ${result.updated} actualizados`);
        } else {
          toast(`❌ Errores: ${result.errors.slice(0,3).join('; ')}`);
        }
      } catch (err) {
        toast('Error subiendo: ' + err.message);
        setEjResult({ success: false, errors: [err.message] });
      } finally {
        setEjUploading(false);
      }
    };
    reader.readAsText(ejFile);
  };

  const runCleanup = async () => {
    if (!cleanupConfirm) return;
    setCleanupLoading(true);
    try {
      await onlyCleanup();
      toast('✅ Limpieza completa - Todo borrado');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast('Error: ' + err.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  const runCleanupAndSeed = async () => {
    if (!cleanupConfirm) return;
    setSeedLoading(true);
    try {
      await cleanupAndSeed();
      toast('✅ Limpieza + Seed completados - Recargando...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast('Error: ' + err.message);
    } finally {
      setSeedLoading(false);
    }
  };

  if (!isSuper) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#12212D' }}>Solo Super Admin</div>
        <div style={{ color: 'var(--grt)', marginTop: 8 }}>Esta sección requiere rol super_admin</div>
      </div>
    );
  }

  const stats = {
    ejecutivos: getEjs().length,
    clientes: getClis().length
  };

  return (
    <div>
      <div className="ph">
        Administración de Datos
        <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600, marginLeft: 8 }}>
          Super Admin · Zona peligrosa
        </span>
      </div>
      <div className="ps">
        <strong>⚠️ ZONA PELIGROSA:</strong> Estas acciones son irreversibles. Úselas con extrema precaución.
        Actual: <strong>{stats.ejecutivos}</strong> ejecutivos · <strong>{stats.clientes}</strong> clientes
      </div>

      {/* 1. LIMPIEZA TOTAL */}
      <div className="card" style={{ borderTop: '3px solid #C0392B', background: '#FDF0EE' }}>
        <div className="ct">🧹 Limpieza Total (BORRA TODO)</div>
        <div style={{ fontSize: 12, color: '#C0392B', marginBottom: 12, fontWeight: 600 }}>
          ⚠️ ELIMINA: Todos los clientes, ejecutivos, informes, áreas, workspaces, contribuciones, configs
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={cleanupConfirm} onChange={e => setCleanupConfirm(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#C0392B' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Confirmo que quiero BORRAR TODOS LOS DATOS</span>
        </label>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button 
            className="btn bro" 
            onClick={runCleanup} 
            disabled={!cleanupConfirm || cleanupLoading}
            style={{ background: cleanupLoading ? '#ccc' : '' }}
          >
            {cleanupLoading ? '🧹 Borrando...' : '🧹 SOLO BORRAR TODO'}
          </button>
          
          <button 
            className="btn" 
            onClick={runCleanupAndSeed} 
            disabled={!cleanupConfirm || seedLoading}
            style={{ background: seedLoading ? '#ccc' : 'linear-gradient(135deg,#C0392B,#E74C3C)', border: 'none', color: '#fff' }}
          >
            {seedLoading ? '🌱 Limpiando + Seed...' : '🌱 BORRAR TODO + CREAR SUPER ADMIN'}
          </button>
        </div>
        
        <div style={{ marginTop: 12, fontSize: 11, color: '#8B1A1A', background: '#FFF5F5', padding: 10, borderRadius: 8, border: '1px solid #F5C6CB' }}>
          <strong>Seed Super Admin crea:</strong><br/>
          • Usuario: <code>auxiliar.ti@proservis.com.co</code> / <code>Proservis2026</code><br/>
          • Rol: <strong>super_admin</strong> · Nombre: <strong>Camilo Garcia</strong><br/>
          • Workspace: <code>w1</code> (Proservis Temporales)<br/>
          • Áreas: <code>a1</code> Selección, <code>a2</code> SST, <code>a3</code> Administración<br/>
          • Módulos: <strong>Todos 14 activados</strong>
        </div>
      </div>

      {/* 2. CARGA MASIVA CLIENTES */}
      <div className="card" style={{ borderTop: '3px solid #168A43', marginTop: 14 }}>
        <div className="ct">📥 Carga Masiva de Clientes</div>
        <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>
          Sube un CSV con columnas: NIT, Nombre, Marca, Ciudad, Sector, ejId, driveFolder, selId, sstId, logo
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn bam bsm" onClick={downloadClienteTemplate}>
            📄 Descargar plantilla CSV
          </button>
          <button className="btn bgh bsm" onClick={() => {
            const info = getClienteTemplateInfo();
            const cols = info.headers.map(h => `${h.key} (${h.required ? '*' : 'opcional'}): ${h.desc}`).join('\n');
            alert('COLUMNAS REQUERIDAS:\n\n' + cols);
          }}>
            ℹ️ Ver columnas
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <input 
            type="file" 
            accept=".csv,.txt" 
            onChange={handleCliFile} 
            style={{ flex: 1, minWidth: 200 }}
            disabled={cliUploading}
          />
          {cliFile && (
            <span style={{ fontSize: 12, color: '#168A43' }}>
              ✅ {cliFile.name} ({Math.round(cliFile.size/1024)} KB)
            </span>
          )}
        </div>
        
        {cliPreview && (
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            <strong>Vista previa (primeras 5 filas):</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 10 }}>
              <thead>
                <tr style={{ background: 'var(--gr)', textAlign: 'left' }}>
                  {Object.keys(cliPreview[0]).map(k => <th key={k} style={{ padding: '4px 8px', border: '1px solid var(--grb)' }}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {cliPreview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => <td key={j} style={{ padding: '4px 8px', border: '1px solid var(--grb)' }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <button 
          className="btn bvd" 
          onClick={uploadClientes} 
          disabled={!cliFile || cliUploading}
          style={{ width: '100%', maxWidth: 300 }}
        >
          {cliUploading ? '⏳ Subiendo clientes...' : '📤 Subir Clientes a Firestore'}
        </button>
        
        {cliResult && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, 
            background: cliResult.success ? 'var(--vc)' : '#FFF5F5',
            border: cliResult.success ? '1px solid #C8E6D4' : '1px solid #F5C6CB'
          }}>
            <div style={{ fontWeight: 700, color: cliResult.success ? '#0F6B33' : '#C0392B' }}>
              {cliResult.success ? '✅ ÉXITO' : '❌ ERRORES'}
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Procesados: {cliResult.processed}/{cliResult.total} · 
              Creados: {cliResult.created} · Actualizados: {cliResult.updated}
            </div>
            {cliResult.errors.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, color: '#C0392B' }}>
                  Ver {cliResult.errors.length} error(es)
                </summary>
                <div style={{ marginTop: 8, fontSize: 10, color: '#C0392B', maxHeight: 200, overflow: 'auto' }}>
                  {cliResult.errors.slice(0, 20).map((e, i) => <div key={i} style={{ marginBottom: 2 }}>{e}</div>)}
                  {cliResult.errors.length > 20 && <div>... y {cliResult.errors.length - 20} más</div>}
                </div>
              </details>
            )}
            {cliResult.warnings.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, color: '#E8BB26' }}>
                  Ver {cliResult.warnings.length} advertencia(s)
                </summary>
                <div style={{ marginTop: 8, fontSize: 10, color: '#7A6010' }}>
                  {cliResult.warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 3. CARGA MASIVA EJECUTIVOS */}
      <div className="card" style={{ borderTop: '3px solid #E8BB26', marginTop: 14 }}>
        <div className="ct">👥 Carga Masiva de Ejecutivos</div>
        <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 12 }}>
          Sube un CSV con columnas: Nombre, Email, Rol, Password, WorkspaceId, AreaId, Activo
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn bam bsm" onClick={downloadEjecutivoTemplate}>
            📄 Descargar plantilla CSV
          </button>
          <button className="btn bgh bsm" onClick={() => {
            const info = getEjecutivoTemplateInfo();
            const cols = info.headers.map(h => `${h.key} (${h.required ? '*' : 'opcional'}): ${h.desc}`).join('\n');
            alert('COLUMNAS REQUERIDAS:\n\n' + cols);
          }}>
            ℹ️ Ver columnas
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <input 
            type="file" 
            accept=".csv,.txt" 
            onChange={handleEjFile} 
            style={{ flex: 1, minWidth: 200 }}
            disabled={ejUploading}
          />
          {ejFile && (
            <span style={{ fontSize: 12, color: '#E8BB26' }}>
              ✅ {ejFile.name} ({Math.round(ejFile.size/1024)} KB)
            </span>
          )}
        </div>
        
        {ejPreview && (
          <div style={{ marginBottom: 12, fontSize: 11 }}>
            <strong>Vista previa (primeras 5 filas):</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, fontSize: 10 }}>
              <thead>
                <tr style={{ background: 'var(--gr)', textAlign: 'left' }}>
                  {Object.keys(ejPreview[0]).map(k => <th key={k} style={{ padding: '4px 8px', border: '1px solid var(--grb)' }}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {ejPreview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => <td key={j} style={{ padding: '4px 8px', border: '1px solid var(--grb)' }}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <button 
          className="btn" 
          onClick={uploadEjecutivos} 
          disabled={!ejFile || ejUploading}
          style={{ background: 'linear-gradient(135deg,#E8BB26,#F5D76E)', color: '#12212D', width: '100%', maxWidth: 300 }}
        >
          {ejUploading ? '⏳ Subiendo ejecutivos...' : '📤 Subir Ejecutivos a Firestore'}
        </button>
        
        {ejResult && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8,
            background: ejResult.success ? 'var(--vc)' : '#FFF5F5',
            border: ejResult.success ? '1px solid #C8E6D4' : '1px solid #F5C6CB'
          }}>
            <div style={{ fontWeight: 700, color: ejResult.success ? '#0F6B33' : '#C0392B' }}>
              {ejResult.success ? '✅ ÉXITO' : '❌ ERRORES'}
            </div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Procesados: {ejResult.processed}/{ejResult.total} · 
              Creados: {ejResult.created} · Actualizados: {ejResult.updated}
            </div>
            {ejResult.errors.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, color: '#C0392B' }}>
                  Ver {ejResult.errors.length} error(es)
                </summary>
                <div style={{ marginTop: 8, fontSize: 10, color: '#C0392B', maxHeight: 200, overflow: 'auto' }}>
                  {ejResult.errors.slice(0, 20).map((e, i) => <div key={i} style={{ marginBottom: 2 }}>{e}</div>)}
                  {ejResult.errors.length > 20 && <div>... y {ejResult.errors.length - 20} más</div>}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* 4. SINCRONIZAR LOCALSTORAGE */}
      <div className="card" style={{ marginTop: 14, background: '#FFFEF5', border: '1px solid #FFE082' }}>
        <div className="ct">🔄 Sincronizar LocalStorage → Firestore</div>
        <div style={{ fontSize: 12, color: '#7A6010', marginBottom: 12 }}>
          Fuerza la subida de todo lo que hay en localStorage a Firestore (útil si hay datos offline)
        </div>
        <button className="btn bam" onClick={() => { saveDB(); toast('Sincronización forzada iniciada'); }}>
          🔄 Forzar Sync Ahora
        </button>
      </div>
    </div>
  );
}