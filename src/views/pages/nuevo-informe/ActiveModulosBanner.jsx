/** Recuerda qué módulos lleva este informe y da acceso directo a cambiarlos. */
import { Link } from 'react-router-dom';
import { MODULOS } from '../../../models/constants';

export default function ActiveModulosBanner({ activeModulos }) {
  if (!activeModulos.length) return null;
  return (
    <div className="mod-banner">
      <span className="mod-banner-t">Este informe incluye {activeModulos.length} de {MODULOS.length} módulos:</span>
      <span className="cli-chips">{activeModulos.map(id => <span key={id} className="chip am">{MODULOS.find(m => m.id === id)?.label || id}</span>)}</span>
      <Link to="/config-modulos" className="link">Cambiar módulos</Link>
    </div>
  );
}
