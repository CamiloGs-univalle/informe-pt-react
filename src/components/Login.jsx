import { useState, useEffect } from "react";
import { getEjs } from "../store";

export default function Login({ onLogin }) {
  const [ejId, setEjId] = useState("");
  const [ejs, setEjs] = useState([]);

  useEffect(() => { setEjs(getEjs()); }, []);

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{background:'var(--vd)',height:6, borderRadius:'10px 10px 0 0', position:'absolute', top:0, left:0, right:0}} />
        <div className="login-title">Portal de Gestión</div>
        <div className="login-subtitle">Informes de Clientes — Proservis Temporales</div>
        <label className="flabel">Selecciona tu nombre</label>
        <select className="finput" value={ejId} onChange={e => setEjId(e.target.value)} style={{marginBottom:16}}>
          <option value="">— Seleccionar ejecutivo —</option>
          {ejs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <button className="btn bvd w-full" disabled={!ejId} onClick={() => onLogin(ejId)}>
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
