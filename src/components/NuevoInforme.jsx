import { useState, useEffect, useRef } from "react";
import {
  getClisForEj,
  getClis,
  getEj,
  getCli,
  saveInf,
  toast,
  downloadHTML,
  MOTIVOS_PRE,
  FOTOLABELS,
} from "../store";
import { buildInformeHTML } from "../htmlGenerator";

const blankRQ = () => ({
  id: Date.now() + Math.random(),
  pt: "",
  agencia: "",
  ciudad: "",
  cargo: "",
  solicitadas: 0,
  contratadas: 0,
  nota: "",
});

const blankMotivo = () => ({
  id: Date.now() + Math.random(),
  motivo: "",
  cantidad: 0,
});

const blankCaso = () => ({
  id: Date.now() + Math.random(),
  nombre: "",
  identificacion: "",
  cie10: "",
  fechaInicio: "",
  origen: "AT laboral",
  ciudad: "",
  estado: "Abierto",
  seguimiento: "",
});

export default function NuevoInforme({ ejId }) {
  const [modo, setModo] = useState("ia");
  const [clientes, setClientes] = useState([]);
  const [ejecutivo, setEjecutivo] = useState(null);

  const [cliId, setCliId] = useState("");
  const [periodo, setPeriodo] = useState("");

  const [htmlFile, setHtmlFile] = useState(null);
  const [htmlFileName, setHtmlFileName] = useState("");
  const [htmlFileSize, setHtmlFileSize] = useState(0);
  const [htmlContent, setHtmlContent] = useState("");
  const [iaOver, setIaOver] = useState(false);

  const [logo, setLogo] = useState(null);
  const [rqs, setRqs] = useState([blankRQ()]);
  const [hcInicio, setHcInicio] = useState(0);
  const [hcIng, setHcIng] = useState(0);
  const [hcRet, setHcRet] = useState(0);
  const [hcCierre, setHcCierre] = useState(0);
  const [motivos, setMotivos] = useState([blankMotivo()]);
  const [obsRotacion, setObsRotacion] = useState("");
  const [at, setAt] = useState(0);
  const [oc, setOc] = useState(0);
  const [mat, setMat] = useState(0);
  const [eg, setEg] = useState(0);
  const [arl, setArl] = useState(0);
  const [ind, setInd] = useState(0);
  const [sstObs, setSstObs] = useState("");
  const [sstCasos, setSstCasos] = useState([blankCaso()]);
  const [nliq, setNliq] = useState(0);
  const [ninc, setNinc] = useState(0);
  const [nlic, setNlic] = useState(0);
  const [nhed, setNhed] = useState(0);
  const [nhen, setNhen] = useState(0);
  const [nerr, setNerr] = useState(0);
  const [nobs, setNobs] = useState("");
  const [fotos, setFotos] = useState({});

  const dzRef = useRef(null);
  const logoRef = useRef(null);
  const fotoRefs = useRef([]);

  useEffect(() => {
    if (!ejId) return;
    const clis = getClisForEj(ejId);
    setClientes(clis);
    const ej = getEj(ejId);
    setEjecutivo(ej);
  }, [ejId]);

  useEffect(() => {
    setHcCierre(hcInicio + hcIng - hcRet);
  }, [hcInicio, hcIng, hcRet]);

  const totRqSolicitadas = rqs.reduce((s, r) => s + (Number(r.solicitadas) || 0), 0);
  const totRqContratadas = rqs.reduce((s, r) => s + (Number(r.contratadas) || 0), 0);
  const rqEfectividad = totRqSolicitadas > 0
    ? ((totRqContratadas / totRqSolicitadas) * 100).toFixed(1)
    : "0.0";

  const totMotivos = motivos.reduce((s, m) => s + (Number(m.cantidad) || 0), 0);
  const tasaRotacion = hcCierre > 0
    ? ((totMotivos / hcCierre) * 100).toFixed(2)
    : "0.00";

  /* ── IA Mode handlers ────────────────────────────── */

  const handleHtmlUpload = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".html")) {
      toast("Solo se permiten archivos .html", "error");
      return;
    }
    setHtmlFile(file);
    setHtmlFileName(file.name);
    setHtmlFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => setHtmlContent(e.target.result);
    reader.readAsText(file);
  };

  const handleDropHtml = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIaOver(false);
    const file = e.dataTransfer.files[0];
    handleHtmlUpload(file);
  };

  /* ── Logo / Foto handlers ────────────────────────── */

  const handleLogoUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setLogo(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleFotoUpload = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setFotos((prev) => ({ ...prev, [idx]: e.target.result }));
    reader.readAsDataURL(file);
  };

  /* ── RQ CRUD ─────────────────────────────────────── */

  const updateRq = (id, field, value) =>
    setRqs((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const removeRq = (id) => setRqs((prev) => prev.filter((r) => r.id !== id));

  const addRq = () => setRqs((prev) => [...prev, blankRQ()]);

  /* ── Motivo CRUD ─────────────────────────────────── */

  const updateMotivo = (id, field, value) =>
    setMotivos((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

  const removeMotivo = (id) => setMotivos((prev) => prev.filter((m) => m.id !== id));

  const addMotivo = () => setMotivos((prev) => [...prev, blankMotivo()]);

  /* ── Caso SST CRUD ───────────────────────────────── */

  const updateCaso = (id, field, value) =>
    setSstCasos((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const removeCaso = (id) => setSstCasos((prev) => prev.filter((c) => c.id !== id));

  const addCaso = () => setSstCasos((prev) => [...prev, blankCaso()]);

  /* ── Data builder ────────────────────────────────── */

  const buildData = () => ({
    cliId,
    cliNombre: clientes.find((c) => c.id === cliId)?.nombre || "",
    periodo,
    ejId,
    ejNombre: ejecutivo?.nombre || "",
    logo,
    hcInicio: Number(hcInicio),
    hcIng: Number(hcIng),
    hcRet: Number(hcRet),
    hcCierre,
    at: Number(at),
    oc: Number(oc),
    mat: Number(mat),
    eg: Number(eg),
    arl: Number(arl),
    ind: Number(ind),
    sstObs,
    nliq: Number(nliq),
    ninc: Number(ninc),
    nlic: Number(nlic),
    nhed: Number(nhed),
    nhen: Number(nhen),
    nerr: Number(nerr),
    nobs,
    obsRotacion,
  });

  /* ── Save / Generate ─────────────────────────────── */

  const saveIA = () => {
    if (!cliId) { toast("Seleccione un cliente", "error"); return; }
    if (!periodo) { toast("Seleccione un período", "error"); return; }
    if (!htmlContent) { toast("Suba un archivo HTML", "error"); return; }
    saveInf({
      cliId,
      periodo,
      ejId,
      tipo: "ia",
      html: htmlContent,
      fileName: htmlFileName,
      fecha: new Date().toISOString(),
    });
    toast("Informe guardado");
  };

  const saveManual = (descargar = false) => {
    if (!cliId) { toast("Seleccione un cliente", "error"); return; }
    if (!periodo) { toast("Seleccione un período", "error"); return; }
    const d = buildData();
    const html = buildInformeHTML(d, rqs, motivos, sstCasos, fotos);
    saveInf({
      cliId,
      periodo,
      ejId,
      tipo: "manual",
      html,
      data: d,
      rqs,
      motivos,
      casos: sstCasos,
      fotos,
      fecha: new Date().toISOString(),
    });
    if (descargar) {
      downloadHTML(html, `informe-${d.cliNombre}-${periodo}.html`);
    }
    toast("Informe guardado");
  };

  const cleanForm = () => {
    setCliId("");
    setPeriodo("");
    setHtmlFile(null);
    setHtmlFileName("");
    setHtmlFileSize(0);
    setHtmlContent("");
    setLogo(null);
    setRqs([blankRQ()]);
    setHcInicio(0);
    setHcIng(0);
    setHcRet(0);
    setMotivos([blankMotivo()]);
    setObsRotacion("");
    setAt(0);
    setOc(0);
    setMat(0);
    setEg(0);
    setArl(0);
    setInd(0);
    setSstCasos([blankCaso()]);
    setSstObs("");
    setNliq(0);
    setNinc(0);
    setNlic(0);
    setNhed(0);
    setNhen(0);
    setNerr(0);
    setNobs("");
    setFotos({});
  };

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  return (
    <div className="nuevo-informe">
      {/* ── MODE SELECTOR ──────────────────────────── */}
      <div className="modo-tabs">
        <button
          className={"modo-tab" + (modo === "ia" ? " on" : "")}
          onClick={() => setModo("ia")}
        >
          <span className="mt-ico">🤖</span>
          <span className="mt-tit">Modo IA</span>
          <span className="mt-sub">Sube HTML generado</span>
        </button>
        <button
          className={"modo-tab" + (modo === "manual" ? " on" : "")}
          onClick={() => setModo("manual")}
        >
          <span className="mt-ico">✏️</span>
          <span className="mt-tit">Modo Manual</span>
          <span className="mt-sub">Llena cada sección</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════
          MODO IA
          ══════════════════════════════════════════════ */}
      {modo === "ia" && (
        <div className="modo-panel on">
          {/* Dropzone */}
          <div
            className={"dropzone" + (iaOver ? " over" : "")}
            ref={dzRef}
            onDragOver={(e) => { e.preventDefault(); setIaOver(true); }}
            onDragLeave={() => setIaOver(false)}
            onDrop={handleDropHtml}
            onClick={() => dzRef.current?.querySelector("input")?.click()}
          >
            <input
              type="file"
              accept=".html"
              style={{ display: "none" }}
              onChange={(e) => handleHtmlUpload(e.target.files[0])}
            />
            <div className="dz-ico">📄</div>
            <div className="dz-tit">Arrastra o haz clic</div>
            <div className="dz-sub">HTML generado por IA</div>
            <div className="dz-fmt">
              <span className="fmt-chip">Solo archivos .html</span>
            </div>
          </div>

          {/* Loaded file */}
          {htmlFileName && (
            <div className="arch-list">
              <div className="arch-item">
                <span className="arch-ico">📄</span>
                <div className="arch-info">
                  <div className="arch-nm">{htmlFileName}</div>
                  <div className="arch-sz">{(htmlFileSize / 1024).toFixed(1)} KB</div>
                </div>
                <span className="arch-status">Listo</span>
                <button
                  className="arch-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHtmlFile(null);
                    setHtmlFileName("");
                    setHtmlFileSize(0);
                    setHtmlContent("");
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
            <button className="btn bvd" onClick={saveIA}>
              Guardar informe
            </button>
            {htmlContent && (
              <button
                className="btn bvd"
                onClick={() => downloadHTML(htmlContent, htmlFileName || "informe.html")}
              >
                Descargar HTML
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODO MANUAL
          ══════════════════════════════════════════════ */}
      {modo === "manual" && (
        <div className="modo-panel on">

          {/* ─── SECTION 1 — Cliente y Período ─────── */}
          <div className="card">
            <h3>1. Cliente y Período</h3>
            <div className="fgrid fg2">
              <div>
                <label className="flabel">Cliente</label>
                <select
                  className="finput"
                  value={cliId}
                  onChange={(e) => setCliId(e.target.value)}
                >
                  <option value="">— Seleccione —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flabel">Período</label>
                <input
                  type="month"
                  className="finput"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleLogoUpload(e.target.files[0])}
              />
              {logo ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img
                    src={logo}
                    alt="Logo"
                    style={{ maxHeight: 80, borderRadius: 6 }}
                  />
                  <button
                    className="fdelbtn"
                    style={{ top: -6, right: -6 }}
                    onClick={() => setLogo(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  className="btn bsm"
                  onClick={() => logoRef.current?.click()}
                >
                  📷 Subir logo del cliente
                </button>
              )}
            </div>
          </div>

          {/* ─── SECTION 2 — Selección y contratación ── */}
          <div className="card">
            <h3>2. Selección y contratación</h3>
            <div className="rqsum">
              <span>Solicitadas: <strong>{totRqSolicitadas}</strong></span>
              <span>Contratadas: <strong>{totRqContratadas}</strong></span>
              <span>Efectividad: <strong>{rqEfectividad}%</strong></span>
            </div>

            {rqs.map((rq) => (
              <div className="item-box" key={rq.id}>
                <div className="item-hd">
                  <span style={{ fontWeight: 600 }}>RQ #{rqs.indexOf(rq) + 1}</span>
                  {rqs.length > 1 && (
                    <button className="fdelbtn" onClick={() => removeRq(rq.id)}>✕</button>
                  )}
                </div>
                <div className="fgrid fg3">
                  <div>
                    <label className="flabel">PT</label>
                    <input
                      className="finput"
                      value={rq.pt}
                      onChange={(e) => updateRq(rq.id, "pt", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Agencia</label>
                    <input
                      className="finput"
                      value={rq.agencia}
                      onChange={(e) => updateRq(rq.id, "agencia", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Ciudad</label>
                    <input
                      className="finput"
                      value={rq.ciudad}
                      onChange={(e) => updateRq(rq.id, "ciudad", e.target.value)}
                    />
                  </div>
                </div>
                <div className="fgrid fg4">
                  <div>
                    <label className="flabel">Cargo</label>
                    <input
                      className="finput"
                      value={rq.cargo}
                      onChange={(e) => updateRq(rq.id, "cargo", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Solicitadas</label>
                    <input
                      type="number"
                      className="finput"
                      min={0}
                      value={rq.solicitadas}
                      onChange={(e) => updateRq(rq.id, "solicitadas", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Contratadas</label>
                    <input
                      type="number"
                      className="finput"
                      min={0}
                      value={rq.contratadas}
                      onChange={(e) => updateRq(rq.id, "contratadas", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Nota</label>
                    <textarea
                      className="finput"
                      rows={2}
                      value={rq.nota}
                      onChange={(e) => updateRq(rq.id, "nota", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <button className="btn bgh bsm" onClick={addRq}>
              + Agregar RQ
            </button>
          </div>

          {/* ─── SECTION 3 — Headcount ─────────────── */}
          <div className="card">
            <h3>3. Headcount</h3>
            <div className="fgrid fg4">
              <div>
                <label className="flabel">Activos inicio</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={hcInicio}
                  onChange={(e) => setHcInicio(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Ingresos</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={hcIng}
                  onChange={(e) => setHcIng(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Retiros</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={hcRet}
                  onChange={(e) => setHcRet(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Activos cierre (auto)</label>
                <input
                  type="number"
                  className="finput"
                  value={hcCierre}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* ─── SECTION 4 — Rotación ──────────────── */}
          <div className="card">
            <h3>4. Rotación</h3>
            <div className="rqsum">
              <span>Total retiros: <strong>{totMotivos}</strong></span>
              <span>Tasa: <strong>{tasaRotacion}%</strong></span>
            </div>

            {motivos.map((m) => (
              <div className="item-box" key={m.id}>
                <div className="item-hd">
                  <span style={{ fontWeight: 600 }}>Motivo #{motivos.indexOf(m) + 1}</span>
                  {motivos.length > 1 && (
                    <button className="fdelbtn" onClick={() => removeMotivo(m.id)}>✕</button>
                  )}
                </div>
                <div className="fgrid fg4">
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="flabel">Motivo</label>
                    <select
                      className="finput"
                      value={m.motivo}
                      onChange={(e) => updateMotivo(m.id, "motivo", e.target.value)}
                    >
                      <option value="">— Seleccione —</option>
                      {MOTIVOS_PRE.map((mp) => (
                        <option key={mp} value={mp}>{mp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Cantidad</label>
                    <input
                      type="number"
                      className="finput"
                      min={0}
                      value={m.cantidad}
                      onChange={(e) => updateMotivo(m.id, "cantidad", e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    {motivos.length > 1 && (
                      <button className="fdelbtn" onClick={() => removeMotivo(m.id)}>✕</button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button className="btn bsm" onClick={addMotivo}>
              + Agregar motivo
            </button>

            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Observaciones rotación</label>
              <textarea
                className="finput"
                rows={3}
                value={obsRotacion}
                onChange={(e) => setObsRotacion(e.target.value)}
              />
            </div>
          </div>

          {/* ─── SECTION 5 — SST ───────────────────── */}
          <div className="card">
            <h3>5. SST</h3>
            <div className="fgrid fg4">
              <div>
                <label className="flabel">AT</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={at}
                  onChange={(e) => setAt(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">OC</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={oc}
                  onChange={(e) => setOc(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Maternidad</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={mat}
                  onChange={(e) => setMat(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Días E.G.</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={eg}
                  onChange={(e) => setEg(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="fgrid fg2" style={{ marginTop: "0.5rem" }}>
              <div>
                <label className="flabel">Cobertura ARL %</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  max={100}
                  value={arl}
                  onChange={(e) => setArl(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Inducciones</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={ind}
                  onChange={(e) => setInd(Number(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Observaciones SST</label>
              <textarea
                className="finput"
                rows={3}
                value={sstObs}
                onChange={(e) => setSstObs(e.target.value)}
              />
            </div>

            {/* Sub-sección: Casos médicos en seguimiento */}
            <h4 style={{ marginTop: "1rem" }}>Casos médicos en seguimiento</h4>

            {sstCasos.map((caso) => (
              <div className="item-box" key={caso.id}>
                <div className="item-hd">
                  <span style={{ fontWeight: 600 }}>Caso #{sstCasos.indexOf(caso) + 1}</span>
                  {sstCasos.length > 1 && (
                    <button className="fdelbtn" onClick={() => removeCaso(caso.id)}>✕</button>
                  )}
                </div>
                <div className="fgrid fg4">
                  <div>
                    <label className="flabel">Nombre</label>
                    <input
                      className="finput"
                      value={caso.nombre}
                      onChange={(e) => updateCaso(caso.id, "nombre", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Identificación</label>
                    <input
                      className="finput"
                      value={caso.identificacion}
                      onChange={(e) => updateCaso(caso.id, "identificacion", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">CIE-10</label>
                    <input
                      className="finput"
                      value={caso.cie10}
                      onChange={(e) => updateCaso(caso.id, "cie10", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Fecha inicio</label>
                    <input
                      type="date"
                      className="finput"
                      value={caso.fechaInicio}
                      onChange={(e) => updateCaso(caso.id, "fechaInicio", e.target.value)}
                    />
                  </div>
                </div>
                <div className="fgrid fg4">
                  <div>
                    <label className="flabel">Origen</label>
                    <select
                      className="finput"
                      value={caso.origen}
                      onChange={(e) => updateCaso(caso.id, "origen", e.target.value)}
                    >
                      <option value="AT laboral">AT laboral</option>
                      <option value="Enfermedad laboral">Enfermedad laboral</option>
                      <option value="AT tránsito">AT tránsito</option>
                      <option value="Enfermedad común">Enfermedad común</option>
                    </select>
                  </div>
                  <div>
                    <label className="flabel">Ciudad</label>
                    <input
                      className="finput"
                      value={caso.ciudad}
                      onChange={(e) => updateCaso(caso.id, "ciudad", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flabel">Estado</label>
                    <select
                      className="finput"
                      value={caso.estado}
                      onChange={(e) => updateCaso(caso.id, "estado", e.target.value)}
                    >
                      <option value="Abierto">Abierto</option>
                      <option value="En seguimiento">En seguimiento</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    {sstCasos.length > 1 && (
                      <button className="fdelbtn" onClick={() => removeCaso(caso.id)}>✕</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="flabel">Seguimiento</label>
                  <textarea
                    className="finput"
                    rows={2}
                    value={caso.seguimiento}
                    onChange={(e) => updateCaso(caso.id, "seguimiento", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button className="btn bsm" onClick={addCaso}>
              + Agregar caso
            </button>
          </div>

          {/* ─── SECTION 6 — Nómina ────────────────── */}
          <div className="card">
            <h3>6. Nómina</h3>
            <div className="fgrid fg4">
              <div>
                <label className="flabel">Liquidados</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nliq}
                  onChange={(e) => setNliq(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Incapacidades</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={ninc}
                  onChange={(e) => setNinc(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Licencias</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nlic}
                  onChange={(e) => setNlic(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">HE diurnas</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nhed}
                  onChange={(e) => setNhed(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="fgrid fg2" style={{ marginTop: "0.5rem" }}>
              <div>
                <label className="flabel">HE nocturnas</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nhen}
                  onChange={(e) => setNhen(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Errores nómina</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nerr}
                  onChange={(e) => setNerr(Number(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Observaciones nómina</label>
              <textarea
                className="finput"
                rows={3}
                value={nobs}
                onChange={(e) => setNobs(e.target.value)}
              />
            </div>
          </div>

          {/* ─── SECTION 7 — Fotos de actividades ──── */}
          <div className="card">
            <h3>7. Fotos de actividades</h3>
            <div className="fgrid fgrid" style={{ gap: "1rem" }}>
              {FOTOLABELS.map((label, idx) => (
                <div key={idx} className="fslot">
                  <input
                    ref={(el) => (fotoRefs.current[idx] = el)}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFotoUpload(idx, e.target.files[0])}
                  />
                  {fotos[idx] ? (
                    <div
                      className="fslot-preview"
                      style={{ position: "relative", cursor: "pointer" }}
                      onClick={() => fotoRefs.current[idx]?.click()}
                    >
                      <img
                        src={fotos[idx]}
                        alt={label}
                        style={{
                          width: "100%",
                          height: 140,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                      <button
                        className="fdelbtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFotos((prev) => {
                            const copy = { ...prev };
                            delete copy[idx];
                            return copy;
                          });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className="dropzone"
                      style={{
                        height: 140,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => fotoRefs.current[idx]?.click()}
                    >
                      <div className="dz-ico">📷</div>
                      <div className="dz-sub">{label}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── BOTTOM ACTIONS ────────────────────── */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn bvd" onClick={() => saveManual(true)}>
              📥 Generar y Descargar HTML
            </button>
            <button className="btn bam" onClick={() => saveManual(false)}>
              💾 Solo Guardar
            </button>
            <button className="btn brow" onClick={cleanForm}>
              🗑️ Limpiar Todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
