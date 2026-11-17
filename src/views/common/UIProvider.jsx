/**
 * views/common/UIProvider.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Provee a toda la app dos cosas que antes eran inconsistentes:
 *  - `toast(mensaje, tipo)` → avisos apilados que se ven (ok | error | info).
 *    (Antes había dos sistemas y uno de ellos no mostraba nada.)
 *  - `confirmar({...})` → diálogo de confirmación con el estilo de la app,
 *    en vez del `confirm()` del navegador.
 */
import { useState, useCallback, useRef } from 'react';
import { ToastContext, ConfirmContext } from './useToast';

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const toast = useCallback((message, type = 'ok') => {
    const id = ++idRef.current;
    setToasts(t => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === 'error' ? 6000 : 3500);
  }, []);

  const confirmar = useCallback((opts = {}) => new Promise(resolve => {
    setDialog({ ...opts, resolve });
  }), []);

  const close = (value) => {
    dialog?.resolve(value);
    setDialog(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirmar}>
        {children}
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className={'toast-item ' + t.type}>
              <span className="toast-ico" aria-hidden="true">{t.type === 'error' ? '!' : t.type === 'info' ? 'i' : '✓'}</span>
              <span>{t.message}</span>
              <button className="toast-x" aria-label="Cerrar aviso" onClick={() => setToasts(x => x.filter(y => y.id !== t.id))}>×</button>
            </div>
          ))}
        </div>
        {dialog && (
          <div className="mover on" onClick={() => close(false)} role="presentation">
            <div className="mdl confirm-dlg" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" onClick={e => e.stopPropagation()}>
              <h3 id="cf-t" className="confirm-title">{dialog.title || '¿Confirmas esta acción?'}</h3>
              {dialog.message && <p className="confirm-msg">{dialog.message}</p>}
              <div className="confirm-actions">
                <button className="btn bgh" autoFocus onClick={() => close(false)}>{dialog.cancelLabel || 'Cancelar'}</button>
                <button className={'btn ' + (dialog.danger ? 'bro' : 'bvd')} onClick={() => close(true)}>{dialog.confirmLabel || (dialog.danger ? 'Eliminar' : 'Confirmar')}</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
