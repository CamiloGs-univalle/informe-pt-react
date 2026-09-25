/**
 * views/pages/nuevo-informe/StepIndicator.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * The row of step "pills" at the top of the wizard. Clicking a past or
 * current step jumps to it; future steps are inert (dimmed).
 */
export default function StepIndicator({ steps, step, onStepClick }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
      {steps.map((s, i) => (
        <div key={s.id} style={{
          flex: 1, textAlign: 'center', padding: '6px 2px', borderRadius: 8, cursor: i <= step ? 'pointer' : 'default',
          background: i === step ? 'var(--vc)' : i < step ? 'var(--vc)' : 'transparent',
          border: i === step ? '2px solid var(--vd)' : '2px solid transparent', transition: 'all .2s',
          opacity: i > step ? 0.5 : 1,
        }} onClick={() => i <= step && onStepClick(i)}>
          <div style={{ fontSize: 16 }}>{s.icon}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: i === step ? 'var(--vd)' : i < step ? 'var(--vd)' : 'var(--grt)', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
