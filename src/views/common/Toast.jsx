/**
 * views/common/Toast.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * React-context based toast notifier: wrap the app in `<ToastProvider>`
 * (done once, in `App.jsx`) and call `useToast()` (from `./useToast`) in
 * any component to get a `toast(message)` function.
 */
import { useState, useCallback } from 'react';
import { ToastContext } from './useToast';

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);

  const toast = useCallback((m) => {
    setMsg(m);
    setShow(true);
    setTimeout(() => setShow(false), 3000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={'toast' + (show ? ' on' : '')}>{msg}</div>
    </ToastContext.Provider>
  );
}
