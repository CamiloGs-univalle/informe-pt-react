import { useState } from "react";

export default function Admin() {
  const [smtp, setSmtp] = useState({ host: "smtp.gmail.com", port: 587, user: "", pass: "" });
  const [drive, setDrive] = useState({ carpeta: "Informes_Clientes", estado: "Conectado" });

  return (
    <div className="page">
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Administración</h2>

      <div className="fg3 mb-6">
        <div className="kpi-card">
          <div className="kpi-value" style={{ fontSize: 20 }}>7</div>
          <div className="kpi-label">Ejecutivos</div>
        </div>
        <div className="kpi-card am">
          <div className="kpi-value" style={{ fontSize: 20 }}>5</div>
          <div className="kpi-label">Clientes</div>
        </div>
        <div className="kpi-card bin">
          <div className="kpi-value" style={{ fontSize: 20 }}>6</div>
          <div className="kpi-label">Informes</div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-title">Configuración SMTP</div>
        <div className="fg">
          <div className="fg2">
            <div>
              <label className="flabel">Host</label>
              <input className="finput" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} />
            </div>
            <div>
              <label className="flabel">Puerto</label>
              <input className="finput" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="flabel">Usuario</label>
            <input className="finput" value={smtp.user} onChange={e => setSmtp({ ...smtp, user: e.target.value })} placeholder="correo@gmail.com" />
          </div>
          <div>
            <label className="flabel">Contraseña</label>
            <input className="finput" type="password" value={smtp.pass} onChange={e => setSmtp({ ...smtp, pass: e.target.value })} />
          </div>
          <button className="btn bvd" style={{ alignSelf: "start" }}>Guardar</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-title">Google Drive</div>
        <div className="fg">
          <div>
            <label className="flabel">Carpeta raíz</label>
            <input className="finput" value={drive.carpeta} onChange={e => setDrive({ ...drive, carpeta: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <span className="b bok">{drive.estado}</span>
            <button className="btn bgh bsm">Reconectar</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Gestión de Usuarios</div>
        <div className="alrt aam">Solo el administrador puede gestionar ejecutivos y permisos.</div>
      </div>
    </div>
  );
}