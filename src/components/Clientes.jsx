import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getClisForEj, getInfCountForCli, getEj, fmtPer } from "../store";

export default function Clientes({ ejId }) {
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState([]);
  const ejecutivo = getEj(ejId);

  useEffect(() => {
    if (!ejId) return;
    setClientes(getClisForEj(ejId));
  }, [ejId]);

  const filtered = clientes.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.marca || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.ciu || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.sec || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nit || '').includes(search)
  );

  return (
    <div>
      <div className="ph">Mis Clientes</div>
      <div className="ps">Total: {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} · {ejecutivo?.zona || ''}</div>

      <input className="finput" type="text" placeholder="Buscar por nombre, marca, ciudad o NIT..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320, marginBottom: 14 }} />

      {filtered.length === 0 && (
        <div className="card"><div className="alrt aam">No se encontraron clientes con esos criterios.</div></div>
      )}

      {filtered.map(c => {
        const ni = getInfCountForCli(c.id);
        return (
          <div key={c.id} className="clcard">
            <div className="clav">{c.nom.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="clnm">{c.nom}{c.marca ? ' · ' + c.marca : ''}</div>
              <div className="clmt">{[c.ciu, c.sec, c.nit ? 'NIT: ' + c.nit : ''].filter(Boolean).join(' · ')}</div>
            </div>
            <div className="clri">
              <span className="b bok">{ni} informe{ni !== 1 ? 's' : ''}</span>
              <Link to="/nuevo" className="btn bvd bsm">+ Nuevo</Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}