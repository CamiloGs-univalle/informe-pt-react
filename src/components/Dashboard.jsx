import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getClis, getInfs, getClisForEj, getInfCountForCli } from "../store";

export default function Dashboard({ ejId }) {
  const [mis, setMis] = useState([]);
  const [kpis, setKpis] = useState({ cli: 0, mes: 0, pend: 0, tot: 0 });

  useEffect(() => {
    const clis = ejId ? getClisForEj(ejId) : getClis();
    const infs = getInfs();
    const hoy = new Date();
    const mc = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
    const im = infs.filter(i => i.per === mc);
    const pend = Math.max(0, clis.length - im.filter(i => clis.find(c => c.id === i.cliId)).length);
    setMis(clis);
    setKpis({ cli: clis.length, mes: im.length, pend, tot: infs.length });
  }, [ejId]);

  return (
    <div>
      <div className="ph">Bienvenido al portal</div>
      <div className="ps">Gestiona los informes de tus clientes y genera reportes profesionales.</div>
      {!ejId && <div className="alrt aam">⚠ Selecciona tu nombre arriba para ver tus clientes.</div>}
      <div className="kgrid">
        <div className="kpi"><div className="kl">Clientes asignados</div><div className="kv">{kpis.cli}</div></div>
        <div className="kpi am"><div className="kl">Informes este mes</div><div className="kv">{kpis.mes}</div><div className="ks">Pendientes: {kpis.pend}</div></div>
        <div className="kpi"><div className="kl">Total generados</div><div className="kv">{kpis.tot}</div></div>
      </div>
      <div className="card">
        <div className="ct">Mis clientes — acceso rápido</div>
        {mis.length === 0 && <p style={{color:'var(--grt)',fontSize:13}}>No hay clientes asignados.</p>}
        {mis.slice(0, 8).map(c => {
          const ni = getInfCountForCli(c.id);
          return (
            <div key={c.id} className="clcard">
              <div className="clav">{c.nom.slice(0, 2).toUpperCase()}</div>
              <div>
                <div className="clnm">{c.nom}</div>
                <div className="clmt">{[c.marca, c.ciu, c.sec].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="clri">
                <span className="b bok">{ni} informe{ni !== 1 ? 's' : ''}</span>
                <Link to="/nuevo" className="btn bvd bsm">+ Nuevo</Link>
              </div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <div className="ct">Acciones rápidas</div>
        <div className="brow" style={{marginTop:0}}>
          <Link to="/nuevo" className="btn bvd">✚ Nuevo informe</Link>
          <Link to="/guardados" className="btn bam">☰ Informes guardados</Link>
          <Link to="/aclientes" className="btn bgh">⚙ Gestionar clientes</Link>
        </div>
      </div>
    </div>
  );
}
