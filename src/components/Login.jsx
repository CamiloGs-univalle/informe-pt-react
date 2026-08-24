import { useState, useEffect } from "react";
import { getEjs } from "../store";

export default function Login({ onLogin }) {
  const [ejId, setEjId] = useState("");
  const [ejs, setEjs] = useState([]);

  useEffect(() => {
    setEjs(getEjs());
  }, []);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.5rem" }}>PRO</span>
        </div>
        <div className="login-title">Portal de Gestión</div>
        <div className="login-subtitle">Informes de Clientes — Proservis Temporales</div>
        <label className="login-field">Selecciona tu nombre ejecutivo</label>
        <select
          className="login-field"
          value={ejId}
          onChange={(e) => setEjId(e.target.value)}
          style={{ marginBottom: 16 }}
        >
          <option value="">— Seleccionar ejecutivo —</option>
          {ejs.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
        <button
          className="login-btn"
          disabled={!ejId}
          onClick={() => onLogin(ejId)}
        >
          Iniciar sesión
        </button>
        <div className="login-footer">Proservis Temporales © 2026</div>
      </div>
    </div>
  );
}
