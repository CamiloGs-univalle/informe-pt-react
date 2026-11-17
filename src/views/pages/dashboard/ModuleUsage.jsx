/**
 * views/pages/dashboard/ModuleUsage.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Dos vistas del mismo catálogo de módulos configurables (`MODULOS`):
 *  - AdoptionChart: qué tan usado está cada módulo en los informes ya
 *    generados (admin / super_admin) — útil para ver cuáles casi nadie
 *    activa.
 *  - MyModulesGrid: TODOS los módulos con su estado (en todos, en algunos o
 *    en ningún cliente que lidera la persona) — deja explícito qué NO va a
 *    aparecer en su próximo informe, que es justamente el punto de la
 *    personalización por cliente (ver htmlReport.service.js).
 */
import { MODULOS } from '../../../models/constants';
import { moduloIncluido } from '../../../models/ModuloConfig';
import { fmtNum } from '../../../utils/format';
import { BarList } from './charts';

export function AdoptionChart({ infs }) {
  const withModules = infs.filter(i => i.activeModules && i.activeModules.length);
  const counts = MODULOS.map(m => ({
    label: m.label, icon: m.icon,
    value: withModules.filter(i => i.activeModules.includes(m.id)).length,
  })).sort((a, b) => b.value - a.value);
  return (
    <>
      <BarList items={counts} emptyText="Aún no hay informes con módulos registrados." />
      {withModules.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 10 }}>
          Sobre {withModules.length} informe{withModules.length !== 1 ? 's' : ''} con datos de personalización.
        </div>
      )}
    </>
  );
}

export function MyModulesGrid({ clientes }) {
  const total = clientes.length;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 8 }}>
      {MODULOS.map(m => {
        const n = clientes.filter(c => moduloIncluido(c, m.id)).length;
        const on = total > 0 && n === total;
        const parcial = n > 0 && n < total;
        return (
          <div key={m.id} style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8,
            background: on ? 'var(--vc)' : parcial ? 'var(--amc)' : 'var(--gr)', border: '1px solid ' + (on ? '#C8E6D4' : parcial ? '#F0DC8A' : 'var(--grb)'), opacity: n ? 1 : .65,
          }}>
            <span style={{ fontSize: 15 }}>{m.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{m.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--vd)' : parcial ? '#7A6010' : 'var(--grt)' }}>
                {on ? '✓ En todos los clientes' : parcial ? `En ${fmtNum(n)} de ${fmtNum(total)} clientes` : 'No aparece'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
