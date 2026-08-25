import { useState, useEffect } from "react";
import { getEjs } from "../store";
import { LB } from "../logos";

export default function Login({ onLogin }) {
  const [ejId, setEjId] = useState("");
  const [ejs, setEjs] = useState([]);

  useEffect(() => { setEjs(getEjs()); }, []);

  return (
    <div style={{minHeight:'100vh',background:'var(--gr)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:12,padding:'36px 32px',width:'100%',maxWidth:400,boxShadow:'0 2px 12px rgba(0,0,0,.1)',textAlign:'center'}}>
        <img src={"data:image/png;base64," + LB} alt="Proservis" style={{height:50,marginBottom:16}} />
        <div style={{fontSize:19,fontWeight:700,color:'var(--tx)',marginBottom:4}}>Portal de Gestión</div>
        <div style={{fontSize:12,color:'var(--grt)',marginBottom:20}}>Informes de Clientes — Proservis Temporales</div>
        <label className="flabel" style={{textAlign:'left'}}>Selecciona tu nombre ejecutivo</label>
        <select className="finput" value={ejId} onChange={e => setEjId(e.target.value)}>
          <option value="">— Seleccionar ejecutivo —</option>
          {ejs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <button className="btn bvd" disabled={!ejId} onClick={() => onLogin(ejId)}
          style={{width:'100%',marginTop:16,justifyContent:'center'}}>
          Iniciar sesión
        </button>
      </div>
    </div>
  );
}
