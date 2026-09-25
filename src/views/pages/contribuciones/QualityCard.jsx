/**
 * views/pages/contribuciones/QualityCard.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * "Mi calidad de trabajo": qué tan seguido las contribuciones del
 * trabajador pasan la validación del Ejecutivo sin necesitar correcciones.
 * Reutiliza el Gauge del Dashboard para que el mismo lenguaje visual de
 * "anillo de avance" signifique lo mismo en toda la app.
 */
import { Gauge } from '../dashboard/charts';

export default function QualityCard({ stats }) {
  return (
    <div className="card" style={{ borderTop: '3px solid #168A43' }}>
      <div className="ct">🎯 Mi calidad de trabajo</div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        {stats.qualityPct !== null ? (
          <Gauge pct={stats.qualityPct} size={84} stroke={9} label="Aprobación a la primera" />
        ) : (
          <div style={{
            width: 84, height: 84, borderRadius: '50%', border: '3px dashed var(--grb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            fontSize: 9, color: 'var(--grt)', fontWeight: 700, flexShrink: 0, padding: 6,
          }}>Sin datos aún</div>
        )}
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--grt)', lineHeight: 1.5 }}>
            {stats.qualityPct !== null
              ? <>De <strong style={{ color: 'var(--tx)' }}>{stats.validadasHistorico}</strong> contribuciones validadas por tu Ejecutivo, <strong style={{ color: 'var(--vd)' }}>{stats.primeraVez}</strong> pasaron sin correcciones.</>
              : 'Cuando tu Ejecutivo valide tu primera contribución, aquí verás qué tan seguido pasa sin correcciones — es tu calidad de trabajo, medida por quien revisa.'}
          </div>
          <div style={{ display: 'flex', gap: 22, marginTop: 2, flexWrap: 'wrap' }}>
            <MiniStat value={stats.validadasHistorico} label="Validadas en total" color="#168A43" />
            <MiniStat value={stats.rechazosHistorico} label="Correcciones pedidas" color={stats.rechazosHistorico > 0 ? '#C0392B' : 'var(--grt)'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }) {
  return (
    <div>
      <div style={{ fontSize: 21, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--grt)', fontWeight: 600 }}>{label}</div>
    </div>
  );
}
