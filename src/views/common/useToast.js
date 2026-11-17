/**
 * views/common/useToast.js
 * ─────────────────────────────────────────────────────────────────────────
 * Contextos y hooks de retroalimentación al usuario (toast y confirmación).
 * Los provee `UIProvider` (montado una sola vez en `App.jsx`).
 *
 *   const toast = useToast();       toast('Guardado'); toast('No se pudo', 'error');
 *   const confirmar = useConfirm(); if (await confirmar({ message: '¿Eliminar?', danger: true })) …
 */
import { createContext, useContext } from 'react';

export const ToastContext = createContext(() => {});
export const ConfirmContext = createContext(async () => false);

export function useToast() {
  return useContext(ToastContext);
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
