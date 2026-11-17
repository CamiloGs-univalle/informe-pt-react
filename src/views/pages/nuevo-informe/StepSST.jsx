/**
 * views/pages/nuevo-informe/StepSST.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Formulario de SST. Tiene un bloque por cada módulo de SST que la persona reporta:
 *  - SST (siempre): accidentes, origen común, licencias, días de enfermedad general, ARL, inducciones y casos médicos.
 *  - Tasa de accidentalidad (`sst_tasa`): accidentes y personas expuestas por sede.
 *  - Severidad (`sst_severidad`): días perdidos por accidentes de trabajo.
 *  - Investigación de AT (`sst_investigacion`): cuántos accidentes se investigaron y cuántos a tiempo.
 * `modulos` (opcional) dice cuáles módulos están activos para este cliente; si no viene, se muestran todos.
 */
import { fmtDec } from '../../../utils/format';

const SEDES_SUGERIDAS = ['Nacional', 'Cauca', 'Santander'];
const num = (e) => (e.target.value === '' ? 0 : Number(e.target.value));

function Campo({ label, ayuda, value, onChange, min = 0, max }) {
  return (
    <div>
      <label className="flabel">{label}</label>
      <input className="finput" type="number" min={min} max={max} value={value ?? 0} onChange={e => onChange(num(e))} />
      {ayuda && <div className="fhint">{ayuda}</div>}
    </div>
  );
}

export default function StepSST({ sst, setSst, obs, setObs, addCaso, removeCaso, updateCaso, modulos, addSede, removeSede, updateSede }) {
  const ind = sst.indicadores || {};
  const setInd = (k) => (v) => setSst({ ...sst, indicadores: { ...ind, [k]: v } });
  const on = (id) => !Array.isArray(modulos) || modulos.includes(id);
  const sedes = sst.sedes || [];
  const sev = sst.severidad || {};
  const inv = sst.investigacion || {};
  const setSev = (k) => (v) => setSst({ ...sst, severidad: { ...sev, [k]: v } });
  const setInv = (k) => (v) => setSst({ ...sst, investigacion: { ...inv, [k]: v } });
  const yaUsadas = new Set(sedes.map(s => (s.sede || '').trim().toLowerCase()));

  return (
    <div className="stack-14">
      <div className="card">
        <div className="ct">🛡️ SST — Seguridad y salud en el trabajo</div>
        <p className="text-muted" style={{ marginBottom: 10 }}>Escribe los números del mes. Si un dato no aplica, déjalo en 0.</p>
        <div className="fg4">
          <Campo label="Accidentes de trabajo (AT)" value={ind.at} onChange={setInd('at')} />
          <Campo label="Origen común o tránsito (OC)" value={ind.oc} onChange={setInd('oc')} />
          <Campo label="Licencias de maternidad" value={ind.maternidad} onChange={setInd('maternidad')} />
          <Campo label="Días perdidos (enf. general)" value={ind.eg} onChange={setInd('eg')} />
        </div>
        <div className="fg2" style={{ marginTop: 10 }}>
          <Campo label="Cobertura ARL (%)" value={ind.arl} onChange={setInd('arl')} max={100} />
          <Campo label="Inducciones de SST (personas)" value={ind.inducciones} onChange={setInd('inducciones')} />
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="flabel">Observaciones</label>
          <textarea className="finput" value={obs} onChange={e => setObs(e.target.value)} placeholder="Observaciones generales..." />
        </div>
      </div>

      {on('sst_tasa') && (
        <div className="card">
          <div className="ct">📈 Tasa de accidentalidad por sede</div>
          <p className="text-muted" style={{ marginBottom: 10 }}>Por cada sede escribe cuántos accidentes hubo y cuántas personas estaban expuestas (trabajando). El sistema calcula la tasa. Si solo manejas el total de la empresa, usa «Nacional».</p>
          {sedes.map((s, i) => {
            const tasa = Number(s.expuestos) > 0 ? Number(s.at) / Number(s.expuestos) * 100 : 0;
            return (
              <div key={i} className="item-box">
                <div className="item-hd"><span>Sede #{i + 1}</span><button type="button" className="btn bro bsm" onClick={() => removeSede(i)} aria-label={`Quitar sede ${i + 1}`}>✕</button></div>
                <div className="fg3">
                  <div><label className="flabel">Sede</label><input className="finput" value={s.sede} onChange={e => updateSede(i, 'sede', e.target.value)} placeholder="Ej. Nacional, Cauca…" /></div>
                  <Campo label="Accidentes (AT)" value={s.at} onChange={v => updateSede(i, 'at', v)} />
                  <Campo label="Personas expuestas" value={s.expuestos} onChange={v => updateSede(i, 'expuestos', v)} />
                </div>
                <div className="fhint" style={{ marginTop: 6 }}>Tasa de esta sede: <strong>{fmtDec(tasa)} %</strong> (accidentes ÷ personas expuestas × 100)</div>
              </div>
            );
          })}
          <div className="brow" style={{ marginTop: 8 }}>
            {SEDES_SUGERIDAS.filter(n => !yaUsadas.has(n.toLowerCase())).map(n => (
              <button key={n} type="button" className="btn bgh bsm" onClick={() => addSede(n)}>+ {n}</button>
            ))}
            <button type="button" className="btn bvd bsm" onClick={() => addSede('')}>+ Otra sede</button>
          </div>
        </div>
      )}

      {on('sst_severidad') && (
        <div className="card">
          <div className="ct">⚠️ Severidad de los accidentes</div>
          <p className="text-muted" style={{ marginBottom: 10 }}>Cuántos días de trabajo se perdieron por accidentes de trabajo este mes.</p>
          <div className="fg2">
            <Campo label="Días perdidos por accidentes de trabajo" ayuda="Suma de los días de incapacidad por AT." value={sev.diasAT} onChange={setSev('diasAT')} />
            <Campo label="Accidentes que dejaron días perdidos" ayuda="De los accidentes del mes, cuántos generaron incapacidad. Si no lo llevas, déjalo en 0." value={sev.conDias} onChange={setSev('conDias')} />
          </div>
        </div>
      )}

      {on('sst_investigacion') && (
        <div className="card">
          <div className="ct">🔍 Investigación de los accidentes (AT)</div>
          <p className="text-muted" style={{ marginBottom: 10 }}>Cada accidente de trabajo debe investigarse. Aquí cuentas cuántos ya se investigaron y cuántos se hicieron a tiempo.</p>
          <div className="fg3">
            <Campo label="Accidentes que había que investigar" value={inv.total} onChange={setInv('total')} />
            <Campo label="Accidentes ya investigados" value={inv.investigados} onChange={setInv('investigados')} />
            <Campo label="Investigados dentro del plazo (15 días)" ayuda="Si no lo llevas, déjalo en 0 y no se muestra." value={inv.aTiempo} onChange={setInv('aTiempo')} />
          </div>
          {Number(inv.total) > 0 && <div className="fhint" style={{ marginTop: 6 }}>Cumplimiento de la investigación: <strong>{fmtDec(Number(inv.investigados) / Number(inv.total) * 100)} %</strong></div>}
        </div>
      )}

      <div className="card">
        <div className="ct">🩺 Casos médicos en seguimiento</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          <span className="text-muted">Personas con incapacidad, licencia o tratamiento que se siguen cada mes.</span>
          <button type="button" className="btn bvd bsm" onClick={addCaso}>+ Agregar caso</button>
        </div>
        {(sst.casos || []).map((caso, i) => (
          <div key={i} className="item-box">
            <div className="item-hd"><span>Caso #{i + 1}</span><button type="button" className="btn bro bsm" onClick={() => removeCaso(i)} aria-label={`Quitar caso ${i + 1}`}>✕</button></div>
            <div className="fg3">
              <div><label className="flabel">Nombre</label><input className="finput" value={caso.nombre} onChange={e => updateCaso(i, 'nombre', e.target.value)} /></div>
              <div><label className="flabel">Identificación</label><input className="finput" value={caso.identificacion} onChange={e => updateCaso(i, 'identificacion', e.target.value)} /></div>
              <div><label className="flabel">Diagnóstico (CIE-10)</label><input className="finput" value={caso.cie10} onChange={e => updateCaso(i, 'cie10', e.target.value)} /></div>
            </div>
            <div className="fg3" style={{ marginTop: 8 }}>
              <div><label className="flabel">Fecha de inicio</label><input className="finput" type="date" value={caso.fechaInicio} onChange={e => updateCaso(i, 'fechaInicio', e.target.value)} /></div>
              <div><label className="flabel">Origen</label><select className="finput" value={caso.origen} onChange={e => updateCaso(i, 'origen', e.target.value)}><option>AT laboral</option><option>Enfermedad general</option><option>Lic. maternidad</option><option>Tránsito</option><option>Otro</option></select></div>
              <div><label className="flabel">Estado</label><select className="finput" value={caso.estado} onChange={e => updateCaso(i, 'estado', e.target.value)}><option>Abierto</option><option>En tratamiento</option><option>Incapacitado</option><option>Reintegrado</option><option>Cerrado</option></select></div>
            </div>
            <div style={{ marginTop: 8 }}><label className="flabel">Ciudad</label><input className="finput" value={caso.ciudad || ''} onChange={e => updateCaso(i, 'ciudad', e.target.value)} /></div>
            <div style={{ marginTop: 8 }}><label className="flabel">Seguimiento</label><textarea className="finput" value={caso.seguimiento} onChange={e => updateCaso(i, 'seguimiento', e.target.value)} placeholder="Qué se ha hecho y qué sigue" /></div>
          </div>
        ))}
        {!(sst.casos || []).length && <p className="vacio-t text-muted">No hay casos agregados. Si este mes no hubo ninguno, no hace falta agregar nada.</p>}
      </div>
    </div>
  );
}
