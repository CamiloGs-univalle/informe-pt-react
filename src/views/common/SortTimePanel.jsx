/**
 * SortTimePanel.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Panel informativo para extraer datos de SortTime (solo UI, sin extraer por ahora).
 * Muestra credenciales y permite al usuario iniciar extracción si lo necesita para complementar informe.
 * NIT: 800020719, Usuario: 1105361400, URL: https://sorttimeplus.com/sorttimeplus/
 */
import { useState } from 'react';

export default function SortTimePanel({ compact=false }) {
  const [show, setShow] = useState(false);
  return (
    <div className="card" style={{borderLeft:'4px solid #0D47A1', background: compact?'#fff':'#F5F9FF'}}>
      <div className="ct" style={{color:'#0D47A1'}}>🔗 SortTime — fuente complementaria</div>
      <div style={{fontSize:11, color:'var(--grt)', lineHeight:1.5}}>
        Extrae información de <strong>SortTime Plus</strong> para complementar tu informe. No se extrae automáticamente — tú decides cuándo.
        {show && (
          <div style={{marginTop:10, background:'#fff', border:'1px solid #E3F2FD', borderRadius:8, padding:10}}>
            <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:6, fontSize:11}}>
              <span style={{fontWeight:700, color:'var(--grt)'}}>URL:</span> <a href="https://sorttimeplus.com/sorttimeplus/" target="_blank" rel="noreferrer" style={{color:'#0D47A1', wordBreak:'break-all'}}>https://sorttimeplus.com/sorttimeplus/</a>
              <span style={{fontWeight:700}}>NIT:</span> <span>800020719</span>
              <span style={{fontWeight:700}}>Usuario:</span> <span>1105361400</span>
              <span style={{fontWeight:700}}>Contraseña:</span> <span>•••• (1400)</span>
            </div>
            <div style={{marginTop:10, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className="btn bvd bsm" onClick={()=> alert('Extracción SortTime — aquí se conectaría a https://sorttimeplus.com/sorttimeplus/ con NIT 800020719 y usuario 1105361400 para traer incapacidades, ausentismo y novedades. Por ahora solo informativo Señor.')} >▶ Extraer ahora (demo)</button>
              <button className="btn bgh bsm" onClick={()=> window.open('https://sorttimeplus.com/sorttimeplus/', '_blank')}>Abrir SortTime</button>
            </div>
            <div style={{fontSize:10, color:'var(--grt)', marginTop:6}}>* Solo información. No se guarda contraseña en logs. Úsalo para complementar horas de ausencia, eventos y días perdidos en tu informe.</div>
          </div>
        )}
      </div>
      <div style={{marginTop:8}}>
        <button className="btn bgh bsm" onClick={()=> setShow(!show)}>{show ? 'Ocultar' : 'Ver detalles e iniciar extracción'}</button>
        {!compact && <span style={{fontSize:10, color:'var(--grt)', marginLeft:8}}>Solo si necesitas complementar — no es obligatorio</span>}
      </div>
    </div>
  );
}
