/**
 * views/pages/tablero/ClientProgressCard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Una tarjeta por cliente: anillo de avance, chip por área (con quién y
 * cuándo actualizó), la ficha técnica de Selección cuando hay datos, y las
 * acciones (validar/rechazar por área, previsualizar, exportar).
 */
import { ESTADO_META, ESTADOS } from '../../../models/Contribucion';
import { timeAgo } from '../../../utils/format';
import { Gauge } from '../dashboard/charts';

function AreaChip({ area, contrib, onValidar, onRechazar }) {
  const estado = contrib?.estado || ESTADOS.PENDIENTE;
  const meta = ESTADO_META[estado];
  const puedeDecidir = estado === ESTADOS.COMPLETADO;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4, background: meta.bg, border: '1px solid ' + meta.color + '33',
      borderRadius: 8, padding: '7px 9px', minWidth: 150,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--tx)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{area.nombre}</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</div>
      <div style={{ fontSize: 9, color: 'var(--grt)' }}>{contrib ? timeAgo(contrib.updatedAt) : 'sin actividad'}</div>
      {puedeDecidir && (
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <button className="btn bvd bsm" style={{ fontSize: 9, padding: '2px 6px', flex: 1 }} onClick={onValidar}>✅ Validar</button>
          <button className="btn bro bsm" style={{ fontSize: 9, padding: '2px 6px', flex: 1 }} onClick={onRechazar}>↩️</button>
        </div>
      )}
    </div>
  );
}

export default function ClientProgressCard({
  cli, areas, contribs, pct, todoListo, todoValidado,
  ficha, onValidar, onRechazar, onPreview, onExport, exporting,
}) {
  const borderColor = todoValidado ? '#168A43' : pct >= 50 ? '#E8BB26' : '#DDE4DD';
  return (
    <div className="card" style={{ borderLeft: '4px solid ' + borderColor, marginBottom: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Gauge pct={pct} size={46} stroke={5} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              {cli.nom}{todoValidado && <span style={{ marginLeft: 6 }} title="Todo validado">🎉</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--grt)' }}>{cli.nit || 'sin NIT'} · {contribs.length ? `${resumenLabel(contribs)}` : 'Sin contribuciones aún'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn bgh bsm" onClick={onPreview} disabled={exporting === 'preview'}>{exporting === 'preview' ? '⏳' : '👁'} Vista previa</button>
          <button className="btn bgh bsm" onClick={() => onExport('html')} disabled={!!exporting}>{exporting === 'html' ? '⏳' : '📄'} HTML</button>
          <button className="btn bvd bsm" onClick={() => onExport('pdf')} disabled={!!exporting}>{exporting === 'pdf' ? '⏳' : '📑'} PDF</button>
          <button className="btn bsm" style={{ background: '#E85D04', color: '#fff' }} onClick={() => onExport('pptx')} disabled={!!exporting}>{exporting === 'pptx' ? '⏳' : '📊'} PPTX</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {areas.map(a => {
          const ct = contribs.find(x => x.areaId === a.id);
          return (
            <AreaChip key={a.id} area={a} contrib={ct}
              onValidar={() => onValidar(a.id)} onRechazar={() => onRechazar(a.id, a.nombre)} />
          );
        })}
      </div>

      {ficha.fichaSel ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--vd)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>Ficha de Selección</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, background: '#FBFDFB', border: '1px solid #E8EAE8', borderRadius: 8, padding: 8 }}>
            <Stat label="Oportunidad" sub="Cobertura a tiempo" value={ficha.oportunidad + '%'} tone={ficha.oportunidad} />
            <Stat label="Efectividad" sub={ficha.totalCon + '/' + ficha.totalSol} value={ficha.efectividad + '%'} tone={ficha.efectividad} />
            <Stat label="Tiempo resp." sub="Promedio" value={ficha.tiempoProm + ' días'} tone={ficha.tiempoProm <= 5 ? 100 : ficha.tiempoProm <= 10 ? 60 : 0} />
            <Stat label="Vacantes activas" sub="Pendientes" value={String(ficha.vacAct)} tone={ficha.vacAct === 0 ? 100 : ficha.vacAct <= 3 ? 60 : 0} last />
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: '#8D6E00', background: '#FDF6D8', padding: '6px 8px', borderRadius: 6, marginTop: 10, textAlign: 'center' }}>
          Selección aún no ha subido su ficha — aparecerá aquí en cuanto la complete.
        </div>
      )}
    </div>
  );
}

function resumenLabel(contribs) {
  const completadas = contribs.filter(c => c.estado === ESTADOS.COMPLETADO || c.estado === ESTADOS.VALIDADO).length;
  const pendientes = contribs.filter(c => c.estado === ESTADOS.PENDIENTE).length;
  return `${completadas} completadas · ${pendientes} pendientes`;
}

function Stat({ label, sub, value, tone, last }) {
  const color = tone >= 80 ? '#168A43' : tone >= 50 ? '#E8BB26' : '#C0392B';
  return (
    <div style={{ textAlign: 'center', borderRight: last ? 'none' : '1px solid #E8EAE8' }}>
      <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--grt)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--grt)' }}>{sub}</div>
    </div>
  );
}
