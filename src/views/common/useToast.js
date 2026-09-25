/**
 * views/common/useToast.js
 * ─────────────────────────────────────────────────────────────────────────
 * The toast context + hook, split out from `Toast.jsx` so that file only
 * exports the `ToastProvider` component (a non-component export like this
 * hook in the same file breaks React Fast Refresh for that component).
 *
 * Call `useToast()` from any component under `<ToastProvider>` (mounted
 * once in `App.jsx`) to get a `toast(message)` function.
 */
import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}
