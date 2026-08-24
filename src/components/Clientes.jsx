import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getClisForEj, getClis, getInfCountForCli } from "../store";

export default function Clientes({ ejId }) {
  const [clis, setClis] = useState([]);
  const [busq, setBusq] = useState("");

  useEffect(() => {
    setClis(ejId ? getClisForEj(ejId) : getClis());
  }, [ejId]);

  const filtrados = clis.filter(c =>
    c.nom.toLowerCase().includes(busq.toLowerCase()) ||
    (c.marca || '').toLowerCase().includes(busq.toLowerCase()) ||
    (c.ciu || '').toLowerCase().includes(busq.toLowerCase())
  );

  return (
    <div>
      <div className="ph">Mis clientes</div>
      <div className="ps">Clic en un cliente para crear un nuevo informe</div>
      <input className="finput" type="text" placeholder="Buscar cliente..." value={busq} onChange={e => setBusq(e.target.value)} style={{maxWidth:280,marginBottom:14}} />
      {filtrados.length === 0 && <p style={{color:'var(--grt)',fontSize:13}}>No hay clientes asignados.</p>}
      {filtrados.map(c => {
        const ni = getInfCountForCli(c.id);
        const ej = c.ejId;
        return (
          <div key={c.id} className="clcard">
            <div className="clav">{c.nom.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="clnm">{c.nom}{c.marca ? <span style={{fontWeight:400,fontSize:12,color:'var(--grt)'}}> ({c.marca})</span> : ''}</div>
              <div className="clmt">{[c.nit, c.ciu, c.sec].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="clri">
              <span className="b bok">{ni} informe{ni !== 1 ? 's' : ''}</span>
              <Link to="/nuevo" className="btn bvd bsm">+ Nuevo informe</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
