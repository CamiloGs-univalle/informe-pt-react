/**
 * Formulario real de un aporte (cliente × área × período). Reutiliza los
 * mismos formularios por módulo del asistente "Nuevo informe", así cada área
 * llena exactamente lo suyo (Selección, SST, Nómina, Clima, Fotos…).
 */
import { useEffect, useState } from 'react';
import { saveContribucion, completarContribucion, ESTADOS, ESTADO_META } from '../../../models/Contribucion';
import { MODULOS } from '../../../models/constants';
import { moduloIncluido } from '../../../models/ModuloConfig';
import { parseMultipleExcels, mergeExcelData, extractSST, fusionarSST } from '../../../services/excel.service';
import { downloadPlantillaSeleccion, downloadPlantillaSST, downloadPlantillaHeadcount, downloadPlantillaAusentismo, downloadPlantillaCompleta } from '../../../services/template.service';
import { fmtFechaHora, fmtPerLong } from '../../../utils/format';
import { useToast, useConfirm } from '../../common/useToast';
import ClienteLogo from '../../common/ClienteLogo';
import SortTimeLink from '../../common/SortTimeLink';
import { useInformeData } from '../nuevo-informe/useInformeData';
import ModuleSection from '../nuevo-informe/ModuleSection';
import VistaPreviaAporte from './VistaPreviaAporte';
import { moduloConDatos, avance } from './progreso';

const CON_FORMULARIO = ['headcount', 'seleccion', 'rotacion', 'sst', 'nomina', 'ausentismo', 'capacitacion', 'clima', 'facturacion', 'fotos'];

function hayDatos(datos) {
  return Object.entries(datos).some(([k, v]) => {
    if (k === 'obs') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === 'object') return Object.values(v).some(x => (Array.isArray(x) ? x.length : x && typeof x === 'object' ? Object.keys(x).length : Boolean(x) && x !== 'Al día' && x !== 100));
    return Boolean(v);
  });
}

export default function AporteEditor({ user, cli, area, per, contrib, onClose, onChanged }) {
  const toast = useToast();
  const confirmar = useConfirm();
  const data = useInformeData();
  const [extra, setExtra] = useState({ sst_issa: contrib?.datos?.sst_issa, sst_raw: contrib?.datos?.sst_raw });
  const [subiendo, setSubiendo] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [pestana, setPestana] = useState('llenar'); // en pantallas angostas: 'llenar' | 'vista'
  const { cargar } = data;

  // Carga única de lo guardado (el componente se remonta con `key` al cambiar de cliente/área/período).
  useEffect(() => { cargar(contrib?.datos, { reset: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Solo lo que de verdad va en el informe de este cliente (se decide en Mis módulos).
  const todosModulos = (area.modulos || []);
  const modulos = todosModulos.filter(m => moduloIncluido(cli, m));
  const omitidos = todosModulos.filter(m => !modulos.includes(m));
  const esSST = modulos.some(m => m === 'sst' || m.startsWith('sst_'));
  // Los módulos sst_* (tasa, severidad, investigación) salen de los mismos datos de SST: la persona siempre
  // tiene el formulario manual de SST disponible, además de poder subir el ISSA.
  const forms = modulos.filter(m => CON_FORMULARIO.includes(m));
  if (esSST && !forms.includes('sst')) forms.unshift('sst');
  const derivados = modulos.filter(m => !CON_FORMULARIO.includes(m) && !m.startsWith('sst_'));
  const estado = contrib?.estado || ESTADOS.PENDIENTE;
  const bloqueado = estado === ESTADOS.COMPLETADO || estado === ESTADOS.VALIDADO;
  const meta = ESTADO_META[estado];

  const armarDatos = () => {
    const d = data.datosPara(forms);
    if (d.seleccion) d.seleccion = d.seleccion.filter(r => r.rq || r.cargo || r.solicitadas || r.contratadas);
    if (d.rotacion) d.rotacion = d.rotacion.filter(m => m.motivo || m.cantidad);
    if (d.fotos && !Object.keys(d.fotos).length) delete d.fotos;
    if (extra.sst_issa) d.sst_issa = extra.sst_issa;
    if (extra.sst_raw) d.sst_raw = extra.sst_raw;
    return d;
  };

  const guardar = (nuevoEstado = ESTADOS.EN_PROCESO, obs = contrib?.obs || '') => {
    const datos = armarDatos();
    saveContribucion({ cliId: cli.id, per, areaId: area.id, userId: user.id, estado: nuevoEstado, datos, obs });
    setSucio(false);
    return datos;
  };

  const handleBorrador = () => {
    guardar();
    toast('Borrador guardado. Puedes seguir editándolo cuando quieras.', 'ok');
    onChanged();
  };

  const handleEnviar = async () => {
    const datos = armarDatos();
    if (!hayDatos(datos)) { toast('Agrega al menos un dato antes de enviar tu aporte.', 'error'); return; }
    const ok = await confirmar({ title: 'Enviar al ejecutivo', message: `Vas a enviar tu parte de ${cli.nom} (${fmtPerLong(per)}). El ejecutivo la revisará; mientras tanto no podrás editarla, salvo que la retires.`, confirmLabel: 'Enviar aporte' });
    if (!ok) return;
    guardar(ESTADOS.EN_PROCESO, '');
    completarContribucion(cli.id, per, area.id);
    toast('Aporte enviado al ejecutivo.', 'ok');
    onChanged();
    onClose();
  };

  const handleRetirar = async () => {
    const ok = await confirmar({ title: 'Retirar el envío', message: 'Tu aporte volverá a borrador para que lo edites. El ejecutivo ya no lo verá como pendiente de validar.', confirmLabel: 'Retirar y editar' });
    if (!ok) return;
    saveContribucion({ cliId: cli.id, per, areaId: area.id, userId: user.id, estado: ESTADOS.EN_PROCESO, datos: contrib.datos || {}, obs: contrib.obs || '' });
    toast('Tu aporte volvió a borrador.', 'ok');
    onChanged();
  };

  const handleISSA = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const parsed = await parseMultipleExcels([file]);
      const merged = mergeExcelData(parsed);
      let sstData;
      if (merged._is_issa && merged.db_issa) {
        sstData = extractSST([], { db_issa: merged.db_issa, at_issa: merged.at_issa, periodo: per });
        {
          const n = (v, un, ur) => `${v} ${v === 1 ? un : ur}`;
          toast(`ISSA leído: ${n(sstData.indicadores.at, 'accidente de trabajo', 'accidentes de trabajo')}, ${n(sstData.sedes?.length || 0, 'sede', 'sedes')}, ${n(sstData.severidad?.diasAT || 0, 'día perdido', 'días perdidos')} y ${n(sstData.investigacion?.total || 0, 'accidente por investigar', 'accidentes por investigar')}. Revisa los números abajo.`, 'ok');
        }
      } else {
        sstData = extractSST(merged.sst);
        toast('Archivo leído. No parece un ISSA completo; revisa los datos cargados.', 'info');
      }
      data.setSst(fusionarSST(data.d.sst, sstData)); // conserva lo escrito a mano de los otros módulos de SST
      setExtra({ sst_issa: merged.db_issa, sst_raw: file.name });
      setSucio(true);
    } catch (err) { toast('No se pudo leer el archivo: ' + (err.message || 'formato inválido'), 'error'); }
    setSubiendo(false);
  };

  const plantilla = () => {
    if (modulos.includes('seleccion')) downloadPlantillaSeleccion();
    else if (esSST) downloadPlantillaSST();
    else if (modulos.includes('headcount')) downloadPlantillaHeadcount();
    else if (modulos.includes('ausentismo')) downloadPlantillaAusentismo();
    else downloadPlantillaCompleta();
  };

  const cerrar = async () => {
    if (sucio && !bloqueado) {
      const ok = await confirmar({ title: 'Tienes cambios sin guardar', message: 'Si sales ahora se pierden. ¿Salir sin guardar?', confirmLabel: 'Salir sin guardar', danger: true });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <section className="ap-editor" onChange={() => setSucio(true)} onClick={undefined}>
      <header className="ap-head">
        <ClienteLogo cli={cli} size={44} />
        <div className="ap-id">
          <h2>{cli.nom}</h2>
          <div className="text-muted">{area.nombre} · {fmtPerLong(per)}</div>
        </div>
        <span className="chip" style={{ background: meta.bg, borderColor: meta.color + '66', color: estado === ESTADOS.COMPLETADO ? '#7A6010' : meta.color }}>{meta.label}</span>
        <button type="button" className="btn bgh bsm" onClick={cerrar}>Cerrar</button>
      </header>

      <div className="ap-avance" aria-label="Lo que llevas llenado">
        <strong>{bloqueado ? 'Lo que enviaste:' : 'Lo que llevas:'}</strong>
        {forms.map(m => {
          const ok = moduloConDatos(m, data.d);
          return <span key={m} className={'chip ' + (ok ? 'vd' : '')}>{ok ? '✔' : '○'} {MODULOS.find(x => x.id === m)?.label || m}{ok ? '' : ' · sin datos'}</span>;
        })}
        <span className="text-muted">{avance(forms, data.d).hechos} de {forms.length} {forms.length === 1 ? 'módulo con datos' : 'módulos con datos'}</span>
      </div>
      <div className="ap-pest" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'llenar'} className={'btn bsm ' + (pestana === 'llenar' ? 'bvd' : 'bgh')} onClick={() => setPestana('llenar')}>✏️ {bloqueado ? 'Datos enviados' : 'Llenar'}</button>
        <button type="button" role="tab" aria-selected={pestana === 'vista'} className={'btn bsm ' + (pestana === 'vista' ? 'bvd' : 'bgh')} onClick={() => setPestana('vista')}>👁 Cómo va quedando en el informe</button>
      </div>
      <div className={'ap-cols ap-ver-' + pestana}>
      <div className="ap-izq">
      {estado === ESTADOS.RECHAZADO && (
        <div className="alrt aro"><strong>Tu ejecutivo pidió correcciones:</strong> {contrib?.obs || 'sin detalle; contáctalo para saber qué ajustar.'}</div>
      )}
      {contrib?.updatedAt && <div className="text-muted" style={{ marginBottom: 10 }}>Última actualización: {fmtFechaHora(contrib.updatedAt)}</div>}

      {bloqueado ? (
        <div className="alrt avd">
          {estado === ESTADOS.VALIDADO ? 'Este aporte ya fue validado por el ejecutivo y quedó en el informe.' : 'Enviaste este aporte y está esperando la revisión del ejecutivo.'}
          {estado === ESTADOS.COMPLETADO && <div style={{ marginTop: 8 }}><button type="button" className="btn bgh bsm" onClick={handleRetirar}>Retirar envío para editar</button></div>}
        </div>
      ) : (
        <>
          <div className="ap-guia">
            <strong>¿Cómo llenar tu parte?</strong>
            <ol>
              {esSST
                ? <>
                    <li><b>Con tu archivo ISSA:</b> pulsa «Subir archivo ISSA (Excel)». El sistema lee el archivo y llena los números de SST por ti; después puedes corregirlos.</li>
                    <li><b>A mano:</b> si no tienes el ISSA, escribe los números directamente en los campos de abajo. También puedes combinar las dos formas.</li>
                  </>
                : <>
                    <li><b>A mano:</b> llena los campos de abajo.</li>
                    <li><b>Con Excel:</b> descarga la plantilla, llénala y súbela.</li>
                  </>}
              <li><b>Guarda y envía:</b> «Guardar borrador» conserva lo que llevas; «Enviar al ejecutivo» entrega tu parte para que la revise.</li>
            </ol>
          </div>
          <div className="ap-tools">
            <button type="button" className="btn bgh bsm" onClick={plantilla}>Descargar plantilla de Excel</button>
            {esSST && (
              <label className="btn bvd bsm" style={{ cursor: 'pointer' }}>
                {subiendo ? 'Leyendo archivo…' : extra.sst_raw ? 'Cambiar archivo ISSA' : 'Subir archivo ISSA (Excel)'}
                <input type="file" accept=".xlsx,.xls" hidden onChange={handleISSA} disabled={subiendo} />
              </label>
            )}
            {extra.sst_raw && <span className="chip vd">Archivo: {extra.sst_raw}</span>}
            <SortTimeLink />
          </div>
        </>
      )}

      {omitidos.length > 0 && modulos.length > 0 && (
        <p className="text-muted" style={{ marginBottom: 10 }}>No reportas para este cliente: {omitidos.map(m => MODULOS.find(x => x.id === m)?.label || m).join(', ')}. Puedes cambiarlo en Mis módulos.</p>
      )}
      <fieldset className="ap-forms" disabled={bloqueado}>
        {forms.map(m => (
          <div key={m} className="ap-mod">
            <ModuleSection id={m} data={data} modulos={modulos} onFotoError={(msg) => toast(msg, 'error')} />
          </div>
        ))}
        {!forms.length && (
          <div className="alrt aam">
            {!modulos.length
              ? 'Para este cliente no reportas ningún módulo. Si es un error, actívalos en Mis módulos.'
              : derivados.length
              ? `Los módulos de tu área (${derivados.map(m => MODULOS.find(x => x.id === m)?.label || m).join(', ')}) se calculan a partir del archivo ISSA. Súbelo y envía tu aporte.`
              : 'Tu área todavía no tiene módulos configurados. Pídele al administrador que los asigne en Espacios y áreas.'}
          </div>
        )}
      </fieldset>

      {!bloqueado && (
        <div className="brow ap-foot">
          <button type="button" className="btn bgh" onClick={handleBorrador}>Guardar borrador</button>
          <button type="button" className="btn bvd" onClick={handleEnviar}>Enviar al ejecutivo</button>
          <span className="text-muted">{sucio ? 'Tienes cambios sin guardar.' : 'Todo guardado.'}</span>
        </div>
      )}
      </div>
      <aside className="ap-der" aria-label="Vista previa de tu parte">
        <div className="ap-der-t">
          <strong>{bloqueado ? 'Así quedó tu parte en el informe' : 'Así va quedando tu parte en el informe'}</strong>
          <span className="text-muted">Es lo que verá el cliente. {bloqueado ? '' : 'Se actualiza sola mientras escribes. '}Las secciones de otras áreas se suman cuando el ejecutivo arma el informe completo.</span>
        </div>
        <VistaPreviaAporte cli={cli} per={per} datos={data.d} modulos={[...new Set([...forms, ...modulos])]} />
      </aside>
      </div>
    </section>
  );
}
