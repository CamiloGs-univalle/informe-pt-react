import { useState, useEffect } from "react";
import { getEjs, saveEj, deleteEj, getCliCountForEj, getInfCountForEj } from "../store";
import Modal from "./Modal";

export default function AdminEjecutivos() {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ nom: '', email: '', zona: '' });

  useEffect(() => { setList(getEjs()); }, []);

  const openNew = () => { setForm({ nom: '', email: '', zona: '' }); setEditId(null); setModal(true); };
  const openEdit = (e) => { setForm({ nom: e.nom, email: e.email || '', zona: e.zona || '' }); setEditId(e.id); setModal(true); };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    saveEj({ ...form, id: editId });
    setList(getEjs());
    setModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este ejecutivo?')) { deleteEj(id); setList(getEjs()); }
  };

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Ejecutivos</div>
        <button className="btn bvd" onClick={openNew}>+ Nuevo Ejecutivo</button>
      </div>
      <div className="ps">Total: {list.length} ejecutivo{list.length !== 1 ? 's' : ''}</div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Zona</th><th>Clientes</th><th>Informes</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {list.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.nom}</td>
                <td>{e.email || '—'}</td>
                <td>{e.zona || '—'}</td>
                <td><span className="b bok">{getCliCountForEj(e.id)}</span></td>
                <td><span className="b bwn">{getInfCountForEj(e.id)}</span></td>
                <td>
                  <button className="btn bgh bsm" onClick={() => openEdit(e)} style={{ marginRight: 4 }}>✏️ Editar</button>
                  <button className="btn bro bsm" onClick={() => handleDelete(e.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Ejecutivo' : 'Nuevo Ejecutivo'}>
        <div style={{ marginBottom: 12 }}>
          <label className="flabel">Nombre *</label>
          <input className="finput" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="flabel">Email</label>
          <input className="finput" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="flabel">Zona</label>
          <input className="finput" value={form.zona} onChange={e => setForm({...form, zona: e.target.value})} placeholder="Ciudad o región" />
        </div>
        <div className="brow" style={{ marginTop: 0 }}>
          <button className="btn bvd" onClick={handleSave}>Guardar</button>
          <button className="btn bgh" onClick={() => setModal(false)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}