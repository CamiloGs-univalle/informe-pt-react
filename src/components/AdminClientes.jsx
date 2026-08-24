import { useState, useEffect } from "react";
import Modal from "./Modal";
import { getClis, getEjs, saveCli, deleteCli as delCli } from "../store";

export default function AdminClientes() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [list, setList] = useState([]);
  const [form, setForm] = useState({
    nom: "",
    marca: "",
    nit: "",
    ciu: "",
    sec: "",
    ejId: "",
    logo: null,
    driveFolder: "",
  });

  const reload = () => {
    const data = getClis();
    setList(data);
  };
  useEffect(() => {
    reload();
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm({
      nom: "",
      marca: "",
      nit: "",
      ciu: "",
      sec: "",
      ejId: "",
      logo: null,
      driveFolder: "",
    });
    setModalOpen(true);
  };
  const openEdit = (id) => {
    const c = getClis().find((x) => x.id === id);
    if (c) {
      setEditId(id);
      setForm({
        nom: c.nom || "",
        marca: c.marca || "",
        nit: c.nit || "",
        ciu: c.ciu || "",
        sec: c.sec || "",
        ejId: c.ejId || "",
        logo: c.logo || null,
        driveFolder: c.driveFolder || "",
      });
      setModalOpen(true);
    }
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    saveCli({ ...form, id: editId });
    setModalOpen(false);
    reload();
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    delCli(id);
    reload();
  };

  const filtered = list.filter((c) => {
    const s = search.toLowerCase();
    return (
      c.nom.toLowerCase().includes(s) ||
      (c.marca && c.marca.toLowerCase().includes(s)) ||
      (c.nit && c.nit.toLowerCase().includes(s)) ||
      (c.ciu && c.ciu.toLowerCase().includes(s))
    );
  });

  return (
    <div>
      <div className="ph">
        <h2>Gestionar Clientes</h2>
        <button className="btn bvd" onClick={openNew}>
          + Nuevo Cliente
        </button>
      </div>
      <input
        className="finput"
        style={{ marginBottom: 16 }}
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="tbl">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Marca</th>
            <th>NIT</th>
            <th>Ciudad</th>
            <th>Ejecutivo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => {
            const ej = getEjs().find((e) => e.id === c.ejId);
            return (
              <tr key={c.id}>
                <td>{c.nom}</td>
                <td>{c.marca || "—"}</td>
                <td>{c.nit || "—"}</td>
                <td>{c.ciu || "—"}</td>
                <td>{ej ? ej.nom : "Sin asignar"}</td>
                <td>
                  <button
                    className="btn bgh bsm"
                    onClick={() => openEdit(c.id)}
                  >
                    ✏️ Editar
                  </button>{" "}
                  <button
                    className="btn brow bsm"
                    onClick={() => handleDelete(c.id)}
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <label className="flabel">Nombre</label>
        <input
          className="finput"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />
        <label className="flabel">Marca</label>
        <input
          className="finput"
          value={form.marca}
          onChange={(e) => setForm({ ...form, marca: e.target.value })}
        />
        <label className="flabel">NIT</label>
        <input
          className="finput"
          value={form.nit}
          onChange={(e) => setForm({ ...form, nit: e.target.value })}
        />
        <label className="flabel">Ciudad</label>
        <input
          className="finput"
          value={form.ciu}
          onChange={(e) => setForm({ ...form, ciu: e.target.value })}
        />
        <label className="flabel">Sector</label>
        <input
          className="finput"
          value={form.sec}
          onChange={(e) => setForm({ ...form, sec: e.target.value })}
        />
        <label className="flabel">Ejecutivo</label>
        <select
          className="finput"
          value={form.ejId}
          onChange={(e) => setForm({ ...form, ejId: e.target.value })}
        >
          <option value="">— Sin asignar —</option>
          {getEjs().map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom}
            </option>
          ))}
        </select>
        <div className="brow">
          <button className="btn bvd" onClick={handleSave}>
            Guardar
          </button>
          <button className="btn bgh" onClick={() => setModalOpen(false)}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
