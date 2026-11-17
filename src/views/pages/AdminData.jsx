/**
 * views/pages/AdminData.jsx  (menú: "Datos y cargas")
 * ─────────────────────────────────────────────────────────────────────────
 * Solo super admin. Carga masiva de clientes y personas desde CSV (con vista
 * previa antes de guardar), respaldo descargable y sincronización manual.
 * No incluye borrado total ni contraseñas.
 */
import { useRef, useState } from 'react';
import { DB, saveDBAsync } from '../../models/db';
import {
  COLUMNAS_CLIENTES, COLUMNAS_PERSONAS,
  descargarPlantillaClientes, descargarPlantillaPersonas,
  planClientes, aplicarClientes, planPersonas, aplicarPersonas,
} from '../../utils/massUpload';
import { fmtNum, fmtSize, plural, fmtFechaHora } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';

const ACCION = { crear: ['vd', 'Se creará'], actualizar: ['am', 'Se actualizará'], error: ['ro', 'Con error'] };

/** Tarjeta de importación: elegir archivo → vista previa → confirmar. */
function ImportCard({ titulo, icono, intro, columnas, plantilla, planear, aplicar, objeto }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const inputRef = useRef(null);
  const [archivo, setArchivo] = useState(null);
  const [plan, setPlan] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [verCols, setVerCols] = useState(false);

  const limpiar = () => { setArchivo(null); setPlan(null); if (inputRef.current) inputRef.current.value = ''; };

  const elegir = (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setResultado(null);
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const p = planear(String(lector.result));
        if (!p.total) { toast('El archivo no tiene filas. Revisa que la primera fila sean los encabezados.', 'error'); limpiar(); return; }
        setArchivo(f); setPlan(p);
      } catch (e) { toast('No se pudo leer el archivo: ' + e.message, 'error'); limpiar(); }
    };
    lector.onerror = () => toast('No se pudo leer el archivo.', 'error');
    lector.readAsText(f);
  };

  const importar = async () => {
    const n = plan.crear + plan.actualizar;
    const ok = await confirmar({
      title: `Importar ${plural(n, objeto)}`,
      message: `Se crearán ${plural(plan.crear, 'registro nuevo', 'registros nuevos')} y se actualizarán ${plural(plan.actualizar, 'existente', 'existentes')}.${plan.errores ? ` Las ${plural(plan.errores, 'fila con error', 'filas con error')} se omitirán.` : ''}`,
      confirmLabel: 'Importar',
    });
    if (!ok) return;
    const r = aplicar(plan);
    setResultado(r); limpiar();
    toast(`Listo: ${plural(r.creados, 'creado')}, ${plural(r.actualizados, 'actualizado')}.`);
  };

  return (
    <section className="card imp-card">
      <h2 className="imp-t"><span aria-hidden="true">{icono}</span> {titulo}</h2>
      <p className="text-muted">{intro}</p>
      <div className="row-acts" style={{ marginBottom: 12 }}>
        <button type="button" className="btn bgh bsm" onClick={plantilla}>Descargar plantilla</button>
        <button type="button" className="btn bgh bsm" onClick={() => setVerCols(v => !v)} aria-expanded={verCols}>{verCols ? 'Ocultar columnas' : 'Ver columnas'}</button>
      </div>
      {verCols && (
        <div className="tbl-wrap" style={{ marginBottom: 12 }}>
          <table className="tbl">
            <thead><tr><th>Columna</th><th>Obligatoria</th><th>Qué lleva</th></tr></thead>
            <tbody>{columnas.map(c => <tr key={c.key}><td><code>{c.key}</code></td><td>{c.req ? 'Sí' : 'No'}</td><td>{c.desc}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      <label className="file-pick">
        <input ref={inputRef} type="file" accept=".csv,.txt,text/csv" onChange={elegir} />
        <span className="btn bvd bsm" aria-hidden="true">Elegir archivo CSV</span>
        <span className="text-muted">{archivo ? `${archivo.name} · ${fmtSize(archivo.size)}` : 'Ningún archivo seleccionado'}</span>
      </label>

      {plan && (
        <div style={{ marginTop: 14 }}>
          <div className="imp-sum">
            <span className="chip vd">{plural(plan.crear, 'nuevo')}</span>
            <span className="chip am">{plural(plan.actualizar, 'por actualizar', 'por actualizar')}</span>
            <span className={'chip ' + (plan.errores ? 'ro' : '')}>{plural(plan.errores, 'con error', 'con errores')}</span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th className="num">Fila</th><th>Nombre</th><th>Qué pasará</th><th>Observaciones</th></tr></thead>
              <tbody>
                {plan.filas.slice(0, 100).map(f => (
                  <tr key={f.n} className={f.accion === 'error' ? 'row-bad' : ''}>
                    <td className="num">{f.n}</td>
                    <td>{f.nombre}</td>
                    <td><span className={'chip ' + ACCION[f.accion][0]}>{ACCION[f.accion][1]}</span></td>
                    <td>{[...f.errores, ...f.avisos].join(' ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {plan.total > 100 && <div className="text-muted" style={{ marginTop: 6 }}>Se muestran las primeras 100 de {fmtNum(plan.total)} filas; se importan todas.</div>}
          <div className="brow">
            <button type="button" className="btn bvd" onClick={importar} disabled={!plan.crear && !plan.actualizar}>
              {plan.crear + plan.actualizar ? `Importar ${plural(plan.crear + plan.actualizar, objeto)}` : 'No hay filas válidas'}
            </button>
            <button type="button" className="btn bgh" onClick={limpiar}>Cancelar</button>
          </div>
        </div>
      )}

      {resultado && (
        <div className="alrt avd" style={{ marginTop: 14 }} role="status">
          <strong>Importación terminada.</strong> {plural(resultado.creados, 'creado')} · {plural(resultado.actualizados, 'actualizado')}{resultado.omitidos ? ` · ${plural(resultado.omitidos, 'omitido')}` : ''}.
          {resultado.fallos?.length > 0 && <ul style={{ margin: '6px 0 0 18px' }}>{resultado.fallos.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

export default function AdminData({ user }) {
  const toast = useToast();
  const [sincronizando, setSincronizando] = useState(false);
  const [ultima, setUltima] = useState(null);

  if (user?.role !== 'super_admin') {
    return <EmptyState icon="🔒" title="Solo para super administradores">Esta sección permite cargar y respaldar datos de toda la empresa.</EmptyState>;
  }

  const respaldar = () => {
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `respaldo-proservis-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
    toast('Respaldo descargado. Guárdalo en un lugar seguro: contiene datos de clientes y personas.');
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try { await saveDBAsync(); setUltima(new Date().toISOString()); toast('Todo está sincronizado con la base de datos.'); }
    catch (e) { toast('No se pudo sincronizar: ' + (e.message || 'revisa la conexión y tus permisos.'), 'error'); }
    finally { setSincronizando(false); }
  };

  return (
    <div>
      <PageHeader
        title="Datos y cargas"
        subtitle="Carga clientes y personas desde Excel/CSV, descarga un respaldo y revisa el estado de los datos."
      />

      <div className="kgrid" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="kl">Clientes</div><div className="kv">{fmtNum(DB.clis.length)}</div></div>
        <div className="kpi am"><div className="kl">Personas</div><div className="kv">{fmtNum(DB.ejs.length)}</div></div>
        <div className="kpi"><div className="kl">Informes guardados</div><div className="kv">{fmtNum(DB.infs.length)}</div></div>
        <div className="kpi am"><div className="kl">Aportes de áreas</div><div className="kv">{fmtNum(DB.contribuciones.length)}</div></div>
      </div>

      <ImportCard
        titulo="Cargar clientes" icono="🏢" objeto="cliente"
        intro="Si el NIT ya existe, el cliente se actualiza con los datos del archivo (sin borrar lo que el archivo deje vacío); si no, se crea. Las áreas de cada cliente se asignan después en «Clientes»."
        columnas={COLUMNAS_CLIENTES} plantilla={descargarPlantillaClientes}
        planear={planClientes} aplicar={aplicarClientes}
      />
      <ImportCard
        titulo="Cargar personas" icono="👥" objeto="persona"
        intro="Si el correo ya existe, la persona se actualiza; si no, se crea. No se cargan contraseñas: cada persona entra con ese correo usando Google o su cuenta de Firebase."
        columnas={COLUMNAS_PERSONAS} plantilla={descargarPlantillaPersonas}
        planear={(t) => planPersonas(t, user)} aplicar={(p) => aplicarPersonas(p, user)}
      />

      <section className="card">
        <h2 className="imp-t"><span aria-hidden="true">💾</span> Respaldo y sincronización</h2>
        <p className="text-muted">Los datos viven en Firestore. El respaldo descarga una copia completa en JSON; sincronizar fuerza el envío de cualquier cambio pendiente de este equipo.</p>
        <div className="row-acts">
          <button type="button" className="btn bvd" onClick={respaldar}>Descargar respaldo</button>
          <button type="button" className="btn bgh" onClick={sincronizar} disabled={sincronizando}>{sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
        </div>
        {ultima && <div className="text-muted" style={{ marginTop: 8 }}>Última sincronización manual: {fmtFechaHora(ultima)}</div>}
      </section>
    </div>
  );
}
