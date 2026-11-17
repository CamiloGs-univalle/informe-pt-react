/** Paso 1 (ambos modos): elegir cliente y período. Avisa si ya hay aportes de las áreas o un informe guardado. */
import PeriodPicker from '../../common/PeriodPicker';
import ClienteLogo from '../../common/ClienteLogo';
import { periodoActual, fmtPerLong, plural } from '../../../utils/format';
import { ESTADO_META } from '../../../models/Contribucion';

export default function StepCliente({ clientes, cliId, setCliId, periodo, setPeriodo, ejecutivo, aportes, informeExistente, areaNombre }) {
  const cli = clientes.find(c => c.id === cliId);
  return (
    <div className="card">
      <div className="ct">1 · ¿De qué cliente y de qué mes es el informe?</div>
      <div className="fg2">
        <div>
          <label className="flabel" htmlFor="nuevo-cli">Cliente</label>
          <select id="nuevo-cli" className="finput" value={cliId} onChange={e => setCliId(e.target.value)}>
            <option value="">— Elige un cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.marca ? ' · ' + c.marca : ''}</option>)}
          </select>
        </div>
        <div>
          <span className="flabel">Período</span>
          <PeriodPicker value={periodo} onChange={setPeriodo} max={periodoActual()} label="" />
        </div>
      </div>

      {cli && (
        <div className="nv-cli">
          <ClienteLogo cli={cli} size={44} />
          <div>
            <div className="nv-cli-n">{cli.nom}</div>
            <div className="text-muted">{cli.ciu || 'Sin ciudad'} · Ejecutivo líder: {ejecutivo?.nom || 'sin asignar'} · Informe de {fmtPerLong(periodo)}</div>
          </div>
        </div>
      )}

      {cli && aportes.length > 0 && (
        <div className="alrt avd" style={{ marginTop: 12 }}>
          <strong>Ya hay aportes de {plural(aportes.length, 'área')} para este mes</strong> y se cargaron en el informe. Podrás revisarlos y ajustarlos en los siguientes pasos.
          <div className="cli-chips" style={{ marginTop: 8 }}>
            {aportes.map(a => { const m = ESTADO_META[a.estado]; return <span key={a.id} className="chip" style={{ background: m.bg, borderColor: m.color + '66' }}>{areaNombre(a.areaId)}: {m.label}</span>; })}
          </div>
        </div>
      )}
      {cli && aportes.length === 0 && <div className="alrt aam" style={{ marginTop: 12 }}>Las áreas todavía no han subido su parte de este mes. Puedes llenar el informe tú mismo en los siguientes pasos.</div>}
      {informeExistente && <div className="alrt aam" style={{ marginTop: 12 }}>Este cliente ya tiene un informe guardado de {fmtPerLong(periodo)}. Si guardas uno nuevo, te preguntaremos si quieres reemplazarlo.</div>}
    </div>
  );
}
