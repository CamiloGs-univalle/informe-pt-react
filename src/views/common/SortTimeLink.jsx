/** Enlace opcional a SortTime Plus. La URL se configura con VITE_SORTTIME_URL; no se guardan credenciales. */
import { SORTTIME_URL } from '../../config/app.config';

export default function SortTimeLink() {
  if (!SORTTIME_URL) return null;
  return <a className="btn bgh bsm" href={SORTTIME_URL} target="_blank" rel="noreferrer">Abrir SortTime Plus ↗</a>;
}
