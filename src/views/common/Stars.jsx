/**
 * views/common/Stars.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Shared 1-5 star rating control — read-only (Dashboard, listados) or
 * interactive (el modal de calificación en Guardados). Un solo componente
 * para que el lenguaje visual de "calidad" sea idéntico en toda la app.
 */
export default function Stars({ value = 0, onChange, readonly = false, size = 18 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(n)}
          aria-label={n + ' estrella' + (n !== 1 ? 's' : '')}
          style={{
            background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer',
            fontSize: size, color: n <= value ? '#E8BB26' : '#DDE4DD', padding: 0, lineHeight: 1,
            transition: 'transform .1s',
          }}
          onMouseEnter={(e) => { if (!readonly) e.currentTarget.style.transform = 'scale(1.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >★</button>
      ))}
    </span>
  );
}
