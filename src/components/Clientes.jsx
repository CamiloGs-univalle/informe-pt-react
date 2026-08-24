import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getClisForEj, getInfCountForCli, getEj } from "../store";

export default function Clientes({ ejId }) {
  const [busq, setBusq] = useState("");
  const [clis, setClis] = useState([]);

  useEffect(() => {
    setClis(ejId ? getClisForEj(ejId) : []);
  }, [ejId]);

  const filtrados = clis.filter(c =>
    c.nom.toLowerCase().includes(busq.toLowerCase()) ||
    (c.marca || "").toLowerCase().includes(busq.toLowerCase()) ||
    (c.ciu || "").toLowerCase().includes(busq.toLowerCase())
  );

  return (
    <div>
      <div className="ph">
        <h2>Mis Clientes</h2>
        <p className="ps">Total: {clis.length} clientes</p>
      </div>

      <input
        className="finput"
        type="text"
        placeholder="Buscar por nombre, marca o ciudad..."
        value={busq}
        onChange={e => setBusq(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      {filtrados.length === 0 && (
        <p style={{ color: "var(--grt)", fontSize: 13 }}>
          No hay clientes asignados.
        </p>
      )}

      {filtrados.map(c => {
        const ni = getInfCountForCli(c.id);
        return (
          <div key={c.id} className="clcard">
            <div className="clav">{c.nom.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="clnm">
                {c.nom}
                {c.marca ? (
                  <span style={{ fontWeight: 400, fontSize: 12, color: "var(--grt)" }}>
                    {" "}({c.marca})
                  </span>
                ) : (
                  ""
                )}
              </div>
              <div className="clmt">
                {[c.marca, c.ciu, c.sec, c.nit].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="clri">
              <span className="b bok">
                {ni} informe{ni !== 1 ? "s" : ""}
              </span>
              <Link to="/nuevo" className="btn bvd bsm">
                + Nuevo
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
