import { useState, useEffect } from "react";
import { getInfs, getClis, getCli, downloadHTML } from "../store";

export default function Guardados() {
  const [busq, setBusq] = useState("");
  const [mes, setMes] = useState("");
  const [infs, setInfs] = useState([]);

  useEffect(() => {
    const raw = getInfs();
    const clis = getClis();
    const merged = raw.map(inf => {
      const cli = getCli(inf.cliId);
      return { ...inf, cli };
    }).reverse();
    setInfs(merged);
  }, []);

  const filtrados = infs.filter(inf => {
    const nm = inf.cli ? inf.cli.nom.toLowerCase() : "";
    return (
      (!busq || nm.includes(busq.toLowerCase())) &&
      (!mes || inf.per === mes)
    );
  });

  const descInf = inf => {
    const nombre = inf.cli
      ? inf.cli.nom.replace(/\s+/g, "_")
      : "Cliente";
    downloadHTML(inf.html, `Informe_${nombre}_${inf.per}.html`);
  };

  return (
    <div>
      <div className="ph">
        <h2>Informes Guardados</h2>
        <p className="ps">Total: {filtrados.length} informes</p>
      </div>

      <div className="clcard" style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <input
          className="finput"
          type="text"
          placeholder="Buscar por nombre..."
          value={busq}
          onChange={e => setBusq(e.target.value)}
        />
        <input
          className="finput"
          type="month"
          value={mes}
          onChange={e => setMes(e.target.value)}
        />
      </div>

      {filtrados.length === 0 && (
        <p style={{ color: "var(--grt)", fontSize: 13 }}>
          No hay informes guardados aún.
        </p>
      )}

      {filtrados.map(inf => {
        const initials = inf.cli
          ? inf.cli.nom.slice(0, 2).toUpperCase()
          : "??";
        const periodLabel = inf.per
          ? (() => {
              const [y, m] = inf.per.split("-");
              const meses = [
                "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
              ];
              return `${meses[+m - 1]} ${y}`;
            })()
          : "—";
        const fecha = inf.ts
          ? new Date(inf.ts).toLocaleDateString("es-CO")
          : "";

        return (
          <div key={inf.id} className="card">
            <div className="clcard">
              <div className="clav">{initials}</div>
              <div>
                <div className="clnm">
                  {inf.cli ? inf.cli.nom : "Cliente"}
                </div>
                <div className="clmt">
                  {periodLabel} · {fecha}
                </div>
              </div>
              <div className="clri">
                <button
                  className="btn bvd bsm"
                  onClick={() => descInf(inf)}
                >
                  📥 Descargar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
