import { useState, useEffect } from "react";
import { getInfs, getCli, getEj, fmtPer, toast, downloadHTML } from "../store";

export default function Guardados() {
  const [infs, setInfs] = useState([]);
  const [busq, setBusq] = useState("");
  const [mes, setMes] = useState("");

  useEffect(() => { setInfs(getInfs()); }, []);

  const filtrados = infs.filter(inf => {
    const c = getCli(inf.cliId);
    const nm = c ? c.nom.toLowerCase() : '';
    return (!busq || nm.includes(busq.toLowerCase())) && (!mes || inf.per === mes);
  }).reverse();

  const descInf = (inf) => {
    const c = getCli(inf.cliId);
    downloadHTML(inf.html, 'Informe_' + (c ? c.nom.replace(/\s+/g, '_') : 'Cliente') + '_' + inf.per + '.html');
    toast('⬇ Descargado');
  };

  return (
    <div>
      <div className="ph">Informes guardados</div>
      <div className="ps">Historial de todos los informes generados</div>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div><label className="flabel" style={{marginTop:0}}>Buscar</label><input className="finput" type="text" placeholder="Nombre del cliente..." value={busq} onChange={e => setBusq(e.target.value)} style={{width:200}} /></div>
        <div><label className="flabel" style={{marginTop:0}}>Mes</label><input className="finput" type="month" value={mes} onChange={e => setMes(e.target.value)} style={{width:160}} /></div>
        <button className="btn bgh bsm" onClick={() => { setBusq(''); setMes(''); }}>✕ Limpiar</button>
      </div>
      {filtrados.length === 0 && <p style={{color:'var(--grt)',fontSize:13}}>Sin informes con esos filtros.</p>}
      {filtrados.length > 0 && (
        <table className="tbl">
          <thead><tr><th>Cliente</th><th>Período</th><th>Ejecutivo</th><th>Generado</th><th>Acción</th></tr></thead>
          <tbody>
            {filtrados.map(inf => {
              const c = getCli(inf.cliId);
              const ej = getEj(inf.ejId);
              return (
                <tr key={inf.id}>
                  <td><strong>{c ? c.nom : '—'}</strong>{c && c.marca ? <><br/><span style={{fontSize:11,color:'var(--grt)'}}>{c.marca}</span></> : ''}</td>
                  <td>{fmtPer(inf.per)}</td>
                  <td>{ej ? ej.nom : '—'}</td>
                  <td style={{fontSize:11,color:'var(--grt)'}}>{new Date(inf.ts).toLocaleDateString('es-CO')}</td>
                  <td><button className="btn bvd bsm" onClick={() => descInf(inf)}>⬇ HTML</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
