import { useState, useEffect } from "react";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busq, setBusq] = useState("");

  useEffect(() => {
    setClientes([
      { id: "c1", nombre: "Incubadora Santander", marca: "Huevos Kikes", nit: "890.203.084-5", ciu: "Girón", sec: "Alimentos", ej: "Andrea Martínez", mods: ["Sel", "HC", "Rot", "SST", "Nom", "Fot"], informes: 3 },
      { id: "c2", nombre: "Empresa Modelo ABC", marca: "ABC", nit: "800.100.200-1", ciu: "Bucaramanga", sec: "Manufactura", ej: "Andrea Gómez", mods: ["Sel", "HC", "Rot", "SST", "Nom", "Fot"], informes: 2 },
      { id: "c3", nombre: "Industrias del Sur", nit: "900.300.400-2", ciu: "Cali", sec: "Logística", ej: "Carlos Martínez", mods: ["Sel", "HC", "Rot", "SST", "Nom", "Fot"], informes: 4 },
      { id: "c4", nombre: "Cruz Roja Colombiana", marca: "Seccional Valle", ciu: "Cali", sec: "Salud / ONG", ej: "Andrea Martínez", mods: ["Sel", "HC", "Rot", "SST", "Nom", "Fot"], informes: 2 },
      { id: "c5", nombre: "Mi Super Mercado", ciu: "", sec: "Comercio", ej: "Andrea Martínez", mods: ["Sel", "HC", "Rot", "SST", "Nom", "Fot"], informes: 1 },
    ]);
  }, []);

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busq.toLowerCase()) ||
    (c.marca || "").toLowerCase().includes(busq.toLowerCase()) ||
    (c.ciu || "").toLowerCase().includes(busq.toLowerCase())
  );

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Mis Clientes</h2>
        <button className="btn bvd">+ Nuevo cliente</button>
      </div>

      <input
        className="finput"
        placeholder="Buscar por nombre, marca o ciudad..."
        value={busq}
        onChange={e => setBusq(e.target.value)}
        style={{ maxWidth: 400, marginBottom: 16 }}
      />

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Ciudad</th>
              <th>Sector</th>
              <th>Ejecutivo</th>
              <th>Módulos</th>
              <th>Informes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(c => (
              <tr key={c.id}>
                <td>
                  <strong>{c.nombre}</strong>
                  {c.marca && <span style={{ fontSize: 11, color: "#5A6A5A" }}> ({c.marca})</span>}
                  {c.nit && <div style={{ fontSize: 11, color: "#5A6A5A" }}>NIT: {c.nit}</div>}
                </td>
                <td>{c.ciu || "—"}</td>
                <td>{c.sec || "—"}</td>
                <td>{c.ej}</td>
                <td>{c.mods.map(m => <span key={m} className="b bok" style={{ marginRight: 3 }}>{m}</span>)}</td>
                <td><span className="b bin">{c.informes}</span></td>
                <td>
                  <button className="btn bvd bsm" style={{ marginRight: 4 }}>+ Nuevo</button>
                  <button className="btn bgh bsm">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}