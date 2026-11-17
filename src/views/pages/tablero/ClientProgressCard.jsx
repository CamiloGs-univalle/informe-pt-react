/**
 * Tarjeta de un cliente en el tablero del líder: avance, estado por área
 * (con quién subió y cuándo), ficha de Selección y las acciones del informe.
 */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';
import { timeAgo, fmtNum, plural } from '../../../utils/format';
import { Gauge } from '../dashboard/charts';
import ClienteLogo from '../../common/ClienteLogo';

function AreaChip({ area, contrib, quien, onValidar, onRechazar, onVer }) {
  const estado = contrib?.estado || ESTADOS.PENDIENTE;
  const meta = ESTADO_META[estado];
  const puedeDecidir = estado === ESTADOS.COMPLETADO;
  return (
    <div className="tb-area" style={{ background: meta.bg, borderColor: meta.color + '55' }}>
      <div className="tb-area-top">
        <span aria-hidden="true">{meta.icon}</span>
        <span className="tb-area-n" title={area.nombre}>{area.nombre}</span>
      </div>
      <div className="tb-area-st" style={{ color: estado === ESTADOS.COMPLETADO ? '#7A6010' : meta.color }}>{meta.label}</div>
      <div className="tb-area-sub">
        {quien ? <>{quien}{contrib ? ' · ' + timeAgo(contrib.updatedAt) : ''}</> : 'Sin responsable asignado'}
      </div>
      {estado === ESTADOS.RECHAZADO && contrib?.obs && <div className="tb-area-obs" title={contrib.obs}>“{contrib.obs}”</div>}
      {puedeDecidir && (
        <div className="tb-area-act">
          <button type="button" className="btn bvd bsm" onClick={onValidar}>Validar</button>
          <button type="button" className="btn bro bsm" onClick={onRechazar}>Pedir corrección</button>
        </div>
      )}
      {estado !== ESTADOS.PENDIENTE && !puedeDecidir && (
        <button type="button" className="btn bgh bsm tb-area-ver" onClick={onVer}>Ver aporte</button>
      )}
    </div>
  );
}

export default function ClientProgressCard({ cli, filas, pct, listo, ficha, ejecutivo, onValidar, onRechazar, onVer, onPreview, onGuardar, onExport, ocupado, informeGuardado }) {
  const todoValidado = filas.length > 0 && filas.every(f => f.contrib?.estado === ESTADOS.VALIDADO);
  const tono = todoValidado ? 'tono-ok' : pct >= 50 ? 'tono-warn' : '';
  const hayAlgo = filas.some(f => f.contrib && f.contrib.estado !== ESTADOS.PENDIENTE);
  const sinValidar = filas.filter(f => f.contrib && f.contrib.estado !== ESTADOS.VALIDADO && f.contrib.estado !== ESTADOS.PENDIENTE).length;
  return (
    <div className={'tb-card ' + tono}>
      <div className="tb-head">
        <ClienteLogo cli={cli} size={44} />
        <div className="tb-id">
          <div className="tb-nom">{cli.nom}</div>
          <div className="tb-meta">
            {cli.ciu || 'Sin ciudad'}{ejecutivo ? ' · Líder: ' + ejecutivo : ' · Sin ejecutivo líder'}
            {informeGuardado && <span className="chip vd" style={{ marginLeft: 8 }}>Informe guardado</span>}
          </div>
        </div>
        <Gauge pct={pct} size={50} stroke={6} />
      </div>

      <div className="tb-areas">
        {filas.map(f => (
          <AreaChip key={f.area.id} area={f.area} contrib={f.contrib} quien={f.quien}
            onValidar={() => onValidar(f.area)} onRechazar={() => onRechazar(f.area)} onVer={() => onVer(f.area, f.contrib)} />
        ))}
        {!filas.length && <div className="text-muted" style={{ fontSize: 13 }}>Este cliente no tiene áreas asignadas todavía. Asígnalas en Clientes y asignaciones.</div>}
      </div>

      {ficha && (
        <div className="tb-ficha">
          <div className="tb-ficha-t">Ficha de Selección</div>
          <div className="tb-ficha-g">
            <Stat label="Efectividad" value={ficha.efectividad + '%'} sub={`${fmtNum(ficha.totalCon)} de ${fmtNum(ficha.totalSol)}`} tone={ficha.efectividad} />
            <Stat label="Oportunidad" value={ficha.oportunidad + '%'} sub="Cobertura a tiempo" tone={ficha.oportunidad} />
            <Stat label="Tiempo de respuesta" value={fmtNum(ficha.tiempoProm) + ' d'} sub="Promedio" tone={ficha.tiempoProm <= 5 ? 100 : ficha.tiempoProm <= 10 ? 60 : 0} />
            <Stat label="Vacantes activas" value={fmtNum(ficha.vacAct)} sub="Pendientes" tone={ficha.vacAct === 0 ? 100 : ficha.vacAct <= 3 ? 60 : 0} />
          </div>
        </div>
      )}

      <div className="tb-foot">
        <span className="text-muted" style={{ fontSize: 13 }}>
          {!hayAlgo ? 'Aún no hay aportes de las áreas.' : todoValidado ? 'Todo validado: ya puedes cerrar el informe.' : sinValidar ? `${plural(sinValidar, 'aporte')} sin validar.` : 'Esperando a las áreas.'}
        </span>
        <div className="tb-btns">
          <button type="button" className="btn bgh bsm" onClick={onPreview} disabled={!!ocupado || !hayAlgo} title={hayAlgo ? '' : 'Se habilita cuando un área suba su parte'}>{ocupado === 'preview' ? 'Armando…' : 'Vista previa'}</button>
          <button type="button" className="btn bvd bsm" onClick={onGuardar} disabled={!!ocupado || !hayAlgo}>{ocupado === 'guardar' ? 'Guardando…' : informeGuardado ? 'Actualizar informe guardado' : 'Guardar informe final'}</button>
          <button type="button" className="btn bgh bsm" onClick={() => onExport('pdf')} disabled={!!ocupado || !hayAlgo}>{ocupado === 'pdf' ? 'Generando…' : 'PDF'}</button>
          <button type="button" className="btn bgh bsm" onClick={() => onExport('pptx')} disabled={!!ocupado || !hayAlgo}>{ocupado === 'pptx' ? 'Generando…' : 'PowerPoint'}</button>
          <button type="button" className="btn bgh bsm" onClick={() => onExport('html')} disabled={!!ocupado || !hayAlgo}>HTML</button>
        </div>
      </div>
      {listo && !todoValidado && <div className="text-muted" style={{ fontSize: 12 }}>Puedes generar el informe aunque falten validaciones; quedará con lo que haya hoy.</div>}
    </div>
  );
}

function Stat({ label, sub, value, tone }) {
  const color = tone >= 80 ? '#168A43' : tone >= 50 ? '#8D6E00' : '#C0392B';
  return (
    <div className="tb-stat">
      <div className="tb-stat-l">{label}</div>
      <div className="tb-stat-v" style={{ color }}>{value}</div>
      <div className="tb-stat-s">{sub}</div>
    </div>
  );
}
