import { useState, useEffect } from "react";

export default function Guardados() {
  const [informes, setInformes] = useState([]);
  const [busq, setBusq] = useState("");

  useEffect(() => {
    setInformes([
      { id: 1, cliente: "Incubadora Santander", fecha: "2026-08-15", ejecutivo: "Andrea Martínez", modulos: ["sel", "hc", "rot"], estado: "enviado", drive: true },
      { id: 2, cliente: "Cruz Roja Colombiana", fecha: "2026-08-12", ejecutivo: "Andrea Martínez", modulos: ["sel", "sst", "fot"], estado: "guardado", drive: false },
      { id: 3, cliente: "Industrias del Sur", fecha: "2026-08-10", ejecutivo: "Carlos Martínez", modulos: ["sel", "hc", "rot", "sst", "nom", "fot"], estado: "enviado", drive: true },
      { id: 4, cliente: "Empresa Modelo ABC", fecha: "2026-08-08", ejecutivo: "Andrea Gómez", modulos: ["sel", "hc"], estado: "pendiente", drive: false },
      { id: 5, cliente: "Mi Super Mercado", fecha: "2026-08-05", ejecutivo: "Andrea Martínez", modulos: ["sel"], estado: "enviado", drive: true },
    ]);
  }, []);

  const filtrados = informes.filter(i =>
    i.cliente.toLowerCase().includes(busq.toLowerCase()) ||
    i.ejecutivo.toLowerCase().includes(busq.toLowerCase())
  );

  const estadoBadge = (e) => {
    if (e === "enviado") return <span className="b bok">Enviado</span>;
    if (e === "guardado") return <span className="b bwn">Guardado</span>;
    return <span className="b bin">Pendiente</span>;
  };

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Informes Guardados</h2>
        <span className="b bok">{informes.length} informe{informes.length !== 1 ? "s" : ""}</span>
      </div>

      <input
        className="finput"
        placeholder="Buscar por cliente o ejecutivo..."
        value={busq}
        onChange={e => setBusq(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 16 }}
      />

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Ejecutivo</th>
              <th>Módulos</th>
              <th>Estado</th>
              <th>Drive</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(i => (
              <tr key={i.id}>
                <td>#{i.id}</td>
                <td><strong>{i.cliente}</strong></td>
                <td>{i.fecha}</td>
                <td>{i.ejecutivo}</td>
                <td>
                  {i.modulos.map(m => (
                    <span key={m} className="b bok" style={{ marginRight: 3 }}>{m.toUpperCase()}</span>
                  ))}
                </td>
                <td>{estadoBadge(i.estado)}</td>
                <td>{i.drive ? <span className="b bok">✓</span> : <span className="b bin">—</span>}</td>
                <td>
                  <button className="btn bsm" style={{ marginRight: 4 }}>Ver</button>
                  <button className="btn bsm" style={{ marginRight: 4 }}>PDF</button>
                  <button className="btn bsm">Email</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}