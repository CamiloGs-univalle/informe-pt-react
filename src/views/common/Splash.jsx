import { LogoProservis } from './LogoProservis';

/** Pantalla de carga con la marca mientras arranca la sesión. */
export default function Splash({ text = 'Cargando…' }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <LogoProservis height={46} />
      <div className="spinner" aria-hidden="true" />
      <div className="splash-txt">{text}</div>
    </div>
  );
}
