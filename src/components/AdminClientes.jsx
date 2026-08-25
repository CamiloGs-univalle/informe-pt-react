import { useState, useEffect } from "react";
import { getClis, getEjs, saveCli, deleteCli } from "../store";
import Modal from "./Modal";

export default function AdminClientes() {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [ejs, setEjs] = useState([]);
  const [form, setForm] = useState({ nom: '', marca: '', nit: '', ciu: '', sec: '', ejId: '', driveFolder: '' });

  useEffect(() => { setList(getClis()); setEjs(getEjs()); }, []);

  const openNew = () => { setForm({ nom: '', marca: '', nit: '', ciu: '', sec: '', ejId: '', driveFolder: '' }); setEditId(null); setModal(true); };
  const openEdit = (c) => { setForm({ nom: c.nom, marca: c.marca || '', nit: c.nit || '', ciu: c.ciu || '', sec: c.sec || '', ejId: c.ejId || '', driveFolder: c.driveFolder || '' }); setEditId(c.id); setModal(true); };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    saveCli({ ...form, id: editId });
    setList(getClis());
    setModal(false);
  };

  const handleDelete = (id) => {
    if (confirm('¿Eliminar este cliente?')) { deleteCli(id); setList(getClis()); }
  };

  const filtered = list.filter(c =>
    !search || c.nom.toLowerCase().includes(search.toLowerCase()) || (c.marca || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>Gestionar Clientes</div>
        <button className="btn bvd" onClick={openNew}>+ Nuevo Cliente</button>
      </div>
      <div className="ps">Total: {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</div>

      <input className="finput" type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280, marginBottom: 14 }} />

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr><th>Nombre</th><th>Marca</th><th>NIT</th><th>Ciudad</th><th>Ejecutivo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const ej = ejs.find(e => e.id === c.ejId);
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nom}</td>
                  <td>{c.marca || '—'}</td>
                  <td>{c.nit || '—'}</td>
                  <td>{c.ciu || '—'}</td>
                  <td>{ej?.nom || '—'}</td>
                  <td>
                    <button className="btn bgh bsm" onClick={() => openEdit(c)} style={{ marginRight: 4 }}>✏️ Editar</button>
                    <button className="btn bro bsm" onClick={() => handleDelete(c.id)}>🗑️</button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--grt)', padding: 20 }}>No hay clientes</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <div className="fg2" style={{ marginBottom: 12 }}>
          <div><label className="flabel">Nombre *</label><input className="finput" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} /></div>
          <div><label className="flabel">Marca</label><input className="finput" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} /></div>
        </div>
        <div className="fg2" style={{ marginBottom: 12 }}>
          <div><label className="flabel">NIT</label><input className="finput" value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} /></div>
          <div><label className="flabel">Ciudad</label><input className="finput" value={form.ciu} onChange={e => setForm({...form, ciu: e.target.value})} /></div>
        </div>
        <div className="fg2" style={{ marginBottom: 12 }}>
          <div><label className="flabel">Sector</label><input className="finput" value={form.sec} onChange={e => setForm({...form, sec: e.target.value})} /></div>
          <div>
            <label className="flabel">Ejecutivo</label>
            <select className="finput" value={form.ejId} onChange={e => setForm({...form, ejId: e.target.value})}>
              <option value="">— Seleccionar —</option>
              {ejs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="flabel">Ruta Drive (opcional)</label>
          <input className="finput" value={form.driveFolder} onChange={e => setForm({...form, driveFolder: e.target.value})} placeholder="Proservis/Informes/2026/Enero" />
        </div>
        <div className="brow" style={{ marginTop: 0 }}>
          <button className="btn bvd" onClick={handleSave}>Guardar</button>
          <button className="btn bgh" onClick={() => setModal(false)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}