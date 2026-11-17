/** "Mi calidad de trabajo": qué tan seguido tus aportes pasan la validación a la primera. */
import { Gauge } from '../dashboard/charts';
import { fmtNum, plural } from '../../../utils/format';

export default function QualityCard({ stats }) {
  return (
    <div className="card">
      <div className="ct">Mi calidad de trabajo</div>
      <div className="q-row">
        {stats.qualityPct !== null
          ? <Gauge pct={stats.qualityPct} size={84} stroke={9} label="Aprobado a la primera" />
          : <div className="q-empty">Sin datos todavía</div>}
        <div className="q-txt">
          <p className="text-muted">
            {stats.qualityPct !== null
              ? <>De <strong>{plural(stats.validadasHistorico, 'aporte validado', 'aportes validados')}</strong> por tu ejecutivo, <strong>{fmtNum(stats.primeraVez)}</strong> pasaron sin correcciones.</>
              : 'Cuando tu ejecutivo valide tu primer aporte verás aquí qué tan seguido pasa sin correcciones.'}
          </p>
          <div className="q-mini">
            <div><div className="q-n">{fmtNum(stats.validadasHistorico)}</div><div className="text-muted">Validados en total</div></div>
            <div><div className="q-n" style={{ color: stats.rechazosHistorico ? 'var(--ro)' : undefined }}>{fmtNum(stats.rechazosHistorico)}</div><div className="text-muted">Correcciones pedidas</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
