import { useEffect, useState } from 'react';
import { getLogoUrl, onLogosReady } from '../../services/logos.service';
import { iniciales } from '../../utils/format';

/**
 * Logo del cliente con respaldo a iniciales. Si la imagen no carga (archivo
 * movido, URL rota) también cae a las iniciales en vez de mostrar el ícono roto.
 */
export default function ClienteLogo({ cli, size = 42, radius = 10, tone = 'verde' }) {
  const [, setTick] = useState(0);
  const [fallo, setFallo] = useState(false);
  useEffect(() => onLogosReady(() => setTick(t => t + 1)), []);
  const url = fallo ? null : getLogoUrl(cli);
  const box = {
    width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
    background: url ? '#fff' : (tone === 'ambar' ? 'var(--amc)' : 'var(--vc)'),
    border: '1px solid var(--grb)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: tone === 'ambar' ? '#7A6010' : 'var(--vdo)', fontWeight: 800, fontSize: Math.max(11, Math.round(size * 0.34)),
  };
  return (
    <div style={box} aria-hidden="true">
      {url
        ? <img src={url} alt="" loading="lazy" onError={() => setFallo(true)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: Math.round(size * 0.1) }} />
        : iniciales(cli?.nom)}
    </div>
  );
}
