import { useState } from "react";

export default function Nuevo() {
  const [step, setStep] = useState(1);
  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [responsable, setResponsable] = useState("");
  const [selModulos, setSelModulos] = useState([]);

  const clientes = [
    { id: "c1", nombre: "Incubadora Santander" },
    { id: "c2", nombre: "Cruz Roja Colombiana" },
    { id: "c3", nombre: "Mi Super Mercado" },
    { id: "c4", nombre: "Industrias del Sur" },
    { id: "c5", nombre: "Empresa Modelo ABC" },
  ];

  const modulos = [
    { id: "sel", name: "Señalización", cls: "sel" },
    { id: "hc", name: "Hojas de Cambio", cls: "hc" },
    { id: "rot", name: "Rotación", cls: "rot" },
    { id: "sst", name: "SST", cls: "sst" },
    { id: "nom", name: "Nómina", cls: "nom" },
    { id: "fot", name: "Fotos", cls: "fot" },
  ];

  const toggleMod = (id) => {
    setSelModulos(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Nuevo Informe</h2>

      {step === 1 && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title">Paso 1: Seleccionar Cliente</div>
          {clientes.map(c => (
            <div
              key={c.id}
              className="clcard"
              style={{
                borderColor: cliente?.id === c.id ? "var(--vd)" : "#e5e7eb",
                background: cliente?.id === c.id ? "var(--vc)" : "#fff",
              }}
              onClick={() => setCliente(c)}
            >
              <div className="clav">{c.nombre.slice(0, 2).toUpperCase()}</div>
              <div className="clnm">{c.nombre}</div>
            </div>
          ))}
          <button
            className="btn bvd mt-4"
            disabled={!cliente}
            onClick={() => setStep(2)}
          >
            Siguiente
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title">Paso 2: Datos del Informe</div>
          <div className="fg">
            <div>
              <label className="flabel">Fecha</label>
              <input type="date" className="finput" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="flabel">Responsable</label>
              <input
                className="finput"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
                placeholder="Nombre del responsable"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn bgh" onClick={() => setStep(1)}>Volver</button>
            <button
              className="btn bvd"
              disabled={!responsable}
              onClick={() => setStep(3)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-title">Paso 3: Módulos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {modulos.map(m => (
              <div
                key={m.id}
                className={"mchip " + (selModulos.includes(m.id) ? "on" : "")}
                onClick={() => toggleMod(m.id)}
              >
                <div className="mdot" />
                {m.name}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn bgh" onClick={() => setStep(2)}>Volver</button>
            <button
              className="btn bvd"
              disabled={selModulos.length === 0}
              onClick={() => setStep(4)}
            >
              Crear Informe
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <div className="card-title">Informe Creado</div>
          <div className="alrt avd">Informe generado para {cliente?.nombre} el {fecha}</div>
          <p style={{ marginBottom: 8 }}>Módulos seleccionados: {selModulos.join(", ").toUpperCase()}</p>
          <p style={{ marginBottom: 16 }}>Responsable: {responsable}</p>
          <button className="btn bvd" onClick={() => { setStep(1); setCliente(null); setSelModulos([]); setResponsable(""); }}>
            Crear otro informe
          </button>
        </div>
      )}
    </div>
  );
}