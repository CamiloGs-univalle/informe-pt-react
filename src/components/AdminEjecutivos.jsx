import { useState, useEffect } from "react";
import Modal from "./Modal";
import { getEjs, saveEj, deleteEj as delEj } from "../store";

export default function AdminEjecutivos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ nom: "", email: "", zona: "" });

  const reload = () => {
    setList(getEjs());
  };
  useEffect(() => {
    reload();
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm({ nom: "", email: "", zona: "" });
    setModalOpen(true);
  };
  const openEdit = (id) => {
    const e = getEjs().find((x) => x.id === id);
    if (e) {
      setEditId(id);
      setForm({ nom: e.nom || "", email: e.email || "", zona: e.zona || "" });
      setModalOpen(true);
    }
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    saveEj({ ...form, id: editId });
    setModalOpen(false);
    reload();
  };

  const handleDelete = (id) => {
    if (!confirm("¿Eliminar este ejecutivo?")) return;
    delEj(id);
    reload();
  };

  return (
    <div>
      <div className="ph">
        <h2>Ejecutivos</h2>
        <button className="btn bvd" onClick={openNew}>
          + Nuevo Ejecutivo
        </button>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Zona</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td>{e.nom}</td>
              <td>{e.email || "—"}</td>
              <td>{e.zona || "—"}</td>
              <td>
                <button
                  className="btn bgh bsm"
                  onClick={() => openEdit(e.id)}
                >
                  ✏️ Editar
                </button>{" "}
                <button
                  className="btn brow bsm"
                  onClick={() => handleDelete(e.id)}
                >
                  🗑️ Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? "Editar Ejecutivo" : "Nuevo Ejecutivo"}
      >
        <label className="flabel">Nombre</label>
        <input
          className="finput"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />
        <label className="flabel">Email</label>
        <input
          className="finput"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <label className="flabel">Zona</label>
        <input
          className="finput"
          value={form.zona}
          onChange={(e) => setForm({ ...form, zona: e.target.value })}
        />
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
