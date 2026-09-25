/**
 * views/pages/dashboard/ModuleUsage.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Dos vistas del mismo catálogo de módulos configurables (`MODULOS`):
 *  - AdoptionChart: qué tan usado está cada módulo en los informes ya
 *    generados (admin / super_admin) — útil para ver cuáles casi nadie
 *    activa.
 *  - MyModulesGrid: TODOS los módulos con su estado activo/inactivo para
 *    el usuario actual (no solo los activos) — deja explícito qué NO va a
 *    aparecer en su próximo informe, que es justamente el punto de la
 *    personalización por cliente (ver htmlReport.service.js).
 */
import { MODULOS } from '../../../models/constants';
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
        <div style={{ fontSize: 10, color: 'var(--grt)', marginTop: 10 }}>
          Sobre {withModules.length} informe{withModules.length !== 1 ? 's' : ''} con datos de personalización.
        </div>
      )}
    </>
  );
}

export function MyModulesGrid({ cfg }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8 }}>
      {MODULOS.map(m => {
        const on = !!cfg[m.id];
        return (
          <div key={m.id} style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px', borderRadius: 8,
            background: on ? 'var(--vc)' : 'var(--gr)', border: '1px solid ' + (on ? '#C8E6D4' : 'var(--grb)'), opacity: on ? 1 : .65,
          }}>
            <span style={{ fontSize: 15 }}>{m.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: on ? 'var(--vd)' : 'var(--grt)' }}>{on ? '✓ En el informe' : 'No aparece'}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
