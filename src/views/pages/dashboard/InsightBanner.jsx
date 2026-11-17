/**
 * views/pages/dashboard/InsightBanner.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Una línea, coloreada por estado, con lo más importante del momento y —si
 * aplica— un botón que lleva directo a resolverlo. La lógica del mensaje
 * vive en `insight.js`.
 */
import { Link } from 'react-router-dom';

const TONE = { good: 'avd', warn: 'aam', bad: 'aro' };
const ICON = { good: '✓', warn: '!', bad: '!' };

export default function InsightBanner({ insight }) {
  return (
    <div className={'alrt insight ' + TONE[insight.tone]} role="status">
      <span className="insight-ico" aria-hidden="true">{ICON[insight.tone]}</span>
      <span className="insight-txt">{insight.text}</span>
      {insight.to && <Link to={insight.to} className="btn bgh bsm">{insight.cta || 'Ver'}</Link>}
    </div>
  );
}
