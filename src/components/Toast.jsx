import { useState, useEffect, createContext, useContext, useCallback } from "react";

const ToastContext = createContext();

export function useToast() { return useContext(ToastContext); }

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState("");
  const [show, setShow] = useState(false);
  const toast = useCallback((m) => { setMsg(m); setShow(true); setTimeout(() => setShow(false), 2800); }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={"toast" + (show ? " on" : "")}>{msg}</div>
    </ToastContext.Provider>
  );
}
