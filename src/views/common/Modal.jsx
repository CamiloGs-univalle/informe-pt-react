/**
 * views/common/Modal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Diálogo modal estándar: se cierra con Esc, con clic fuera o con ×, bloquea
 * el scroll del fondo y devuelve el foco. Lo usan todas las pantallas de
 * administración.
 */
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="mover on" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }} role="presentation">
      <div className="mdl" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={wide ? { maxWidth: 940 } : undefined}>
        <button type="button" className="mclose" onClick={onClose} aria-label="Cerrar">×</button>
        {title && <h3 className="mdl-title">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
