/** "Ver como": el super admin entra al perfil de cualquier persona y ve lo mismo que ella ve. */
import { createContext, useContext } from 'react';

export const ViewAsContext = createContext({ puede: false, verComo: () => {} });

/** @returns {{puede: boolean, verComo: (id: string) => void}} */
export function useViewAs() { return useContext(ViewAsContext); }

/** Botón reutilizable; no se muestra si quien lo usa no es super admin o es la misma persona. */
export function VerComoBtn({ persona, actualId, className = 'btn bgh bsm' }) {
  const { puede, verComo } = useViewAs();
  if (!puede || !persona || persona.id === actualId) return null;
  if (persona.activo === false) return null;
  return (
    <button type="button" className={className} onClick={() => verComo(persona.id)}
      title={`Entrar como ${persona.nom} y ver lo que ella o él ve`}>Ver como</button>
  );
}
