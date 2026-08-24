import { useState, useEffect } from "react";

export default function Dashboard() {
  const [kpis, setKpis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bridgeOk, setBridgeOk] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8787/api/estado")
      .then(r => r.json())
      .then(d => setBridgeOk(d.ok))
      .catch(() => setBridgeOk(false));

    setKpis([
      { title: "Clientes Activos", value: 5, sub: "De 7 asignados", cls: "" },
      { title: "Informes Mes", value: 12, sub: "Generados este mes", cls: "am" },
      { title: "Enviados Email", value: 8, sub: "Correos este mes", cls: "bin" },
      { title: "Drive", value: 6, sub: "Informes en Drive", cls: "am" },
    ]);

    setClientes([
      { id: "c1", nombre: "Incubadora Santander", informes: 3 },
      { id: "c2", nombre: "Cruz Roja Colombiana", informes: 2 },
      { id: "c3", nombre: "Mi Super Mercado", informes: 1 },
      { id: "c4", nombre: "Industrias del Sur", informes: 4 },
      { id: "c5", nombre: "Empresa Modelo ABC", informes: 2 },
    ]);

    setLoading(false);
  }, []);

  if (loading) return <div className="page">Cargando...</div>;

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Dashboard Ejecutivo</h2>

      <div className="kpi-grid">
        {kpis.map(k => (
          <div key={k.title} className={"kpi-card " + k.cls}>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-label">{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Mis Clientes</h3>
        <span className={"b " + (bridgeOk ? "bok" : "bbd")}>
          {bridgeOk ? "Puente activo" : "Puente apagado"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {clientes.map(c => (
          <div key={c.id} className="clcard" onClick={() => window.location.hash = "#/nuevo"}>
            <div className="clav">{c.nombre.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div className="clnm">{c.nombre}</div>
              <div className="clmt">{c.informes} informe{c.informes !== 1 ? "s" : ""}</div>
            </div>
            <button className="btn bvd bsm">+ Nuevo</button>
          </div>
        ))}
      </div>
    </div>
  );
}