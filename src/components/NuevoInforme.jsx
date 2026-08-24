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

  const [logo, setLogo] = useState(null);
  const [rqs, setRqs] = useState([blankRQ()]);
  const [hcInicio, setHcInicio] = useState(0);
  const [hcIng, setHcIng] = useState(0);
  const [hcRet, setHcRet] = useState(0);
  const [hcCierre, setHcCierre] = useState(0);
  const [motivos, setMotivos] = useState([blankMotivo()]);
  const [obsRotacion, setObsRotacion] = useState("");
  const [accAt, setAccAt] = useState(0);
  const [accOrigen, setAccOrigen] = useState(0);
  const [diasPerdidos, setDiasPerdidos] = useState(0);
  const [licMaternidad, setLicMaternidad] = useState(0);
  const [coberturaArl, setCoberturaArl] = useState(0);
  const [induccionesSst, setInduccionesSst] = useState(0);
  const [casos, setCasos] = useState([blankCaso()]);
  const [obsSst, setObsSst] = useState("");
  const [nomLiquidados, setNomLiquidados] = useState(0);
  const [nomIncap, setNomIncap] = useState(0);
  const [nomLic, setNomLic] = useState(0);
  const [nomHextDiurnas, setNomHextDiurnas] = useState(0);
  const [nomHextNocturnas, setNomHextNocturnas] = useState(0);
  const [nomErrores, setNomErrores] = useState(0);
  const [obsNomina, setObsNomina] = useState("");
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
  const rqEfectividad = totRqSolicitadas > 0 ? ((totRqContratadas / totRqSolicitadas) * 100).toFixed(1) : "0.0";

  const totMotivos = motivos.reduce((s, m) => s + (Number(m.cantidad) || 0), 0);
  const tasaRotacion = hcCierre > 0 ? ((totMotivos / hcCierre) * 100).toFixed(2) : "0.00";

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
    const file = e.dataTransfer.files[0];
    handleHtmlUpload(file);
  };

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

  const updateRq = (id, field, value) => {
    setRqs((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRq = (id) => {
    setRqs((prev) => prev.filter((r) => r.id !== id));
  };

  const addRq = () => {
    setRqs((prev) => [...prev, blankRQ()]);
  };

  const updateMotivo = (id, field, value) => {
    setMotivos((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const removeMotivo = (id) => {
    setMotivos((prev) => prev.filter((m) => m.id !== id));
  };

  const addMotivo = () => {
    setMotivos((prev) => [...prev, blankMotivo()]);
  };

  const updateCaso = (id, field, value) => {
    setCasos((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCaso = (id) => {
    setCasos((prev) => prev.filter((c) => c.id !== id));
  };

  const addCaso = () => {
    setCasos((prev) => [...prev, blankCaso()]);
  };

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
    accAt: Number(accAt),
    accOrigen: Number(accOrigen),
    diasPerdidos: Number(diasPerdidos),
    licMaternidad: Number(licMaternidad),
    coberturaArl: Number(coberturaArl),
    induccionesSst: Number(induccionesSst),
    obsSst,
    nomLiquidados: Number(nomLiquidados),
    nomIncap: Number(nomIncap),
    nomLic: Number(nomLic),
    nomHextDiurnas: Number(nomHextDiurnas),
    nomHextNocturnas: Number(nomHextNocturnas),
    nomErrores: Number(nomErrores),
    obsNomina,
    obsRotacion,
  });

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
    setAccAt(0);
    setAccOrigen(0);
    setDiasPerdidos(0);
    setLicMaternidad(0);
    setCoberturaArl(0);
    setInduccionesSst(0);
    setCasos([blankCaso()]);
    setObsSst("");
    setNomLiquidados(0);
    setNomIncap(0);
    setNomLic(0);
    setNomHextDiurnas(0);
    setNomHextNocturnas(0);
    setNomErrores(0);
    setObsNomina("");
    setFotos({});
  };

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
    const html = buildInformeHTML(d, rqs, motivos, casos, fotos);
    saveInf({
      cliId,
      periodo,
      ejId,
      tipo: "manual",
      html,
      data: d,
      rqs,
      motivos,
      casos,
      fotos,
      fecha: new Date().toISOString(),
    });
    if (descargar) {
      downloadHTML(html, `informe-${d.cliNombre}-${periodo}.html`);
    }
    toast("Informe guardado");
  };

  return (
    <div className="nuevo-informe">
      <div className="modo-tabs">
        <button
          className={`modo-tab ${modo === "ia" ? "on" : ""}`}
          onClick={() => setModo("ia")}
        >
          Subir informe ya generado
        </button>
        <button
          className={`modo-tab ${modo === "manual" ? "on" : ""}`}
          onClick={() => setModo("manual")}
        >
          Modo manual — Campo a campo
        </button>
      </div>

      {/* === MODO IA === */}
      {modo === "ia" && (
        <div className="modo-panel on">
          <div className="card info-card" style={{ borderLeft: "4px solid #2ecc71" }}>
            <p style={{ margin: 0 }}>
              <strong>Cómo funciona:</strong> Ve a{" "}
              <a href="https://claude.ai" target="_blank" rel="noreferrer">
                claude.ai
              </a>
              , genera el informe con datos del cliente, copia el HTML generado
              y súbelo aquí. El sistema lo guardará en la base de datos.
            </p>
          </div>

          <div className="card">
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
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
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
              <div>
                <label className="flabel">Ejecutivo</label>
                <input
                  type="text"
                  className="finput"
                  value={ejecutivo?.nombre || ""}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div
              className="dropzone"
              ref={dzRef}
              onDragOver={(e) => e.preventDefault()}
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
              <div className="dz-tit">Arrastra un archivo .html aquí</div>
              <div className="dz-sub">o haz clic para seleccionar</div>
              <div className="dz-fmt">
                <span className="fmt-chip">.html</span>
              </div>
            </div>

            {htmlFileName && (
              <div className="arch-list">
                <div className="arch-item">
                  <span className="arch-ico">📄</span>
                  <div className="arch-info">
                    <div className="arch-nm">{htmlFileName}</div>
                    <div className="arch-sz">
                      {(htmlFileSize / 1024).toFixed(1)} KB
                    </div>
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
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn bam" onClick={saveIA}>
              Guardar informe
            </button>
            {htmlContent && (
              <button
                className="btn bvd"
                onClick={() =>
                  downloadHTML(htmlContent, htmlFileName || "informe.html")
                }
              >
                Descargar HTML
              </button>
            )}
          </div>
        </div>
      )}

      {/* === MODO MANUAL === */}
      {modo === "manual" && (
        <div className="modo-panel on">
          {/* Sección 1: Cliente y período */}
          <div className="card">
            <h3>1. Cliente y período</h3>
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
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
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
              <div>
                <label className="flabel">Ejecutivo</label>
                <input
                  type="text"
                  className="finput"
                  value={ejecutivo?.nombre || ""}
                  readOnly
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Logo del cliente</label>
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
                  Subir logo
                </button>
              )}
            </div>
          </div>

          {/* Sección 2: Selección y contratación */}
          <div className="card">
            <h3>2. Selección y contratación</h3>
            <div className="rqsum">
              <span>Solicitadas: <strong>{totRqSolicitadas}</strong></span>
              <span>Contratadas: <strong>{totRqContratadas}</strong></span>
              <span>Efectividad: <strong>{rqEfectividad}%</strong></span>
            </div>
            <div className="item-box">
              {rqs.map((rq, idx) => (
                <div className="item-hd" key={rq.id}>
                  <div className="fgrid fg4">
                    <div>
                      <label className="flabel">RQ PT</label>
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
                        onChange={(e) =>
                          updateRq(rq.id, "agencia", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Ciudad</label>
                      <input
                        className="finput"
                        value={rq.ciudad}
                        onChange={(e) =>
                          updateRq(rq.id, "ciudad", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Cargo</label>
                      <input
                        className="finput"
                        value={rq.cargo}
                        onChange={(e) =>
                          updateRq(rq.id, "cargo", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="fgrid fg4">
                    <div>
                      <label className="flabel">Solicitadas</label>
                      <input
                        type="number"
                        className="finput"
                        min={0}
                        value={rq.solicitadas}
                        onChange={(e) =>
                          updateRq(rq.id, "solicitadas", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Contratadas</label>
                      <input
                        type="number"
                        className="finput"
                        min={0}
                        value={rq.contratadas}
                        onChange={(e) =>
                          updateRq(rq.id, "contratadas", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="flabel">Nota</label>
                      <input
                        className="finput"
                        value={rq.nota}
                        onChange={(e) =>
                          updateRq(rq.id, "nota", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  {rqs.length > 1 && (
                    <button
                      className="fdelbtn"
                      onClick={() => removeRq(rq.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn bsm" onClick={addRq}>
              + Agregar RQ
            </button>
          </div>

          {/* Sección 3: Headcount */}
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

          {/* Sección 4: Rotación */}
          <div className="card">
            <h3>4. Rotación</h3>
            <div className="rqsum">
              <span>Total: <strong>{totMotivos}</strong></span>
              <span>Tasa: <strong>{tasaRotacion}%</strong></span>
            </div>
            <div className="item-box">
              {motivos.map((m) => (
                <div className="item-hd" key={m.id}>
                  <div className="fgrid fg4">
                    <div style={{ gridColumn: "span 2" }}>
                      <label className="flabel">Motivo</label>
                      <select
                        className="finput"
                        value={m.motivo}
                        onChange={(e) =>
                          updateMotivo(m.id, "motivo", e.target.value)
                        }
                      >
                        <option value="">— Seleccione —</option>
                        {MOTIVOS_PRE.map((mp) => (
                          <option key={mp} value={mp}>
                            {mp}
                          </option>
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
                        onChange={(e) =>
                          updateMotivo(m.id, "cantidad", e.target.value)
                        }
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      {motivos.length > 1 && (
                        <button
                          className="fdelbtn"
                          onClick={() => removeMotivo(m.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

          {/* Sección 5: SST */}
          <div className="card">
            <h3>5. SST</h3>
            <div className="fgrid fg3">
              <div>
                <label className="flabel">Accidentes AT</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={accAt}
                  onChange={(e) => setAccAt(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Origen común / tránsito</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={accOrigen}
                  onChange={(e) => setAccOrigen(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Días perdidos E.G.</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={diasPerdidos}
                  onChange={(e) => setDiasPerdidos(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Licencias maternidad</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={licMaternidad}
                  onChange={(e) => setLicMaternidad(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Cobertura ARL %</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  max={100}
                  value={coberturaArl}
                  onChange={(e) => setCoberturaArl(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Inducciones SST</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={induccionesSst}
                  onChange={(e) => setInduccionesSst(Number(e.target.value))}
                />
              </div>
            </div>

            <h4 style={{ marginTop: "1rem" }}>Casos médicos</h4>
            <div className="item-box">
              {casos.map((caso) => (
                <div className="item-hd" key={caso.id}>
                  <div className="fgrid fg4">
                    <div>
                      <label className="flabel">Nombre</label>
                      <input
                        className="finput"
                        value={caso.nombre}
                        onChange={(e) =>
                          updateCaso(caso.id, "nombre", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Identificación</label>
                      <input
                        className="finput"
                        value={caso.identificacion}
                        onChange={(e) =>
                          updateCaso(caso.id, "identificacion", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Diagnóstico CIE-10</label>
                      <input
                        className="finput"
                        value={caso.cie10}
                        onChange={(e) =>
                          updateCaso(caso.id, "cie10", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Fecha inicio</label>
                      <input
                        type="date"
                        className="finput"
                        value={caso.fechaInicio}
                        onChange={(e) =>
                          updateCaso(caso.id, "fechaInicio", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="fgrid fg4">
                    <div>
                      <label className="flabel">Origen</label>
                      <select
                        className="finput"
                        value={caso.origen}
                        onChange={(e) =>
                          updateCaso(caso.id, "origen", e.target.value)
                        }
                      >
                        <option value="AT laboral">AT laboral</option>
                        <option value="Enfermedad laboral">
                          Enfermedad laboral
                        </option>
                        <option value="AT tránsito">AT tránsito</option>
                        <option value="Enfermedad común">
                          Enfermedad común
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="flabel">Ciudad</label>
                      <input
                        className="finput"
                        value={caso.ciudad}
                        onChange={(e) =>
                          updateCaso(caso.id, "ciudad", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="flabel">Estado</label>
                      <select
                        className="finput"
                        value={caso.estado}
                        onChange={(e) =>
                          updateCaso(caso.id, "estado", e.target.value)
                        }
                      >
                        <option value="Abierto">Abierto</option>
                        <option value="En seguimiento">En seguimiento</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      {casos.length > 1 && (
                        <button
                          className="fdelbtn"
                          onClick={() => removeCaso(caso.id)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="flabel">Seguimiento</label>
                    <input
                      className="finput"
                      value={caso.seguimiento}
                      onChange={(e) =>
                        updateCaso(caso.id, "seguimiento", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn bsm" onClick={addCaso}>
              + Agregar caso
            </button>
            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Observaciones SST</label>
              <textarea
                className="finput"
                rows={3}
                value={obsSst}
                onChange={(e) => setObsSst(e.target.value)}
              />
            </div>
          </div>

          {/* Sección 6: Nómina */}
          <div className="card">
            <h3>6. Nómina</h3>
            <div className="fgrid fg3">
              <div>
                <label className="flabel">Total liquidados</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomLiquidados}
                  onChange={(e) => setNomLiquidados(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Incapacidades</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomIncap}
                  onChange={(e) => setNomIncap(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Licencias</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomLic}
                  onChange={(e) => setNomLic(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">H. extras diurnas</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomHextDiurnas}
                  onChange={(e) => setNomHextDiurnas(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">H. extras nocturnas</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomHextNocturnas}
                  onChange={(e) => setNomHextNocturnas(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="flabel">Errores nómina</label>
                <input
                  type="number"
                  className="finput"
                  min={0}
                  value={nomErrores}
                  onChange={(e) => setNomErrores(Number(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <label className="flabel">Observaciones nómina</label>
              <textarea
                className="finput"
                rows={3}
                value={obsNomina}
                onChange={(e) => setObsNomina(e.target.value)}
              />
            </div>
          </div>

          {/* Sección 7: Fotos de actividades */}
          <div className="card">
            <h3>7. Fotos de actividades</h3>
            <div className="fgrid fg3" style={{ gap: "1rem" }}>
              {FOTOLABELS.map((label, idx) => (
                <div key={idx} className="fslot">
                  <div className="fcap">{label}</div>
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
                      style={{
                        position: "relative",
                        cursor: "pointer",
                      }}
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
                      <div className="dz-sub">Subir foto</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="btn bam"
              onClick={() => saveManual(true)}
            >
              Generar y descargar HTML
            </button>
            <button
              className="btn bgh"
              onClick={() => saveManual(false)}
            >
              Guardar sin descargar
            </button>
            <button className="btn brow" onClick={cleanForm}>
              Limpiar formulario
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
