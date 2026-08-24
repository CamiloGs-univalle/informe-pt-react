import { useState, useEffect } from "react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { getEjs, saveEj, deleteEj, getCliCountForEj, getInfCountForEj } from "../store";

export default function AdminEjecutivos() {
  const toast = useToast();
  const [ejs, setEjs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom:'', email:'', zona:'' });

  const reload = () => setEjs(getEjs());
  useEffect(() => { reload(); }, []);

  const openNew = () => { setEditId(null); setForm({ nom:'', email:'', zona:'' }); setModalOpen(true); };
  const openEdit = (id) => {
    const e = getEjs().find(x => x.id === id);
    if (e) { setEditId(id); setForm({ nom:e.nom, email:e.email||'', zona:e.zona||'' }); setModalOpen(true); }
  };

  const handleSave = () => {
    if (!form.nom.trim()) { toast('⚠ Nombre obligatorio'); return; }
    saveEj({ id: editId, ...form });
    toast(editId ? 'Ejecutivo actualizado ✓' : 'Ejecutivo creado ✓');
    setModalOpen(false); reload();
  };

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este ejecutivo?')) return;
    deleteEj(id); toast('Ejecutivo eliminado'); reload();
  };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div><div className="ph">Ejecutivos</div><div className="ps" style={{marginBottom:0}}>Gestiona el equipo</div></div>
        <button className="btn bvd" onClick={openNew}>+ Nuevo ejecutivo</button>
      </div>
      <div className="card">
        <div className="ct">Equipo ({ejs.length})</div>
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Ejecutivo</th><th>Correo</th><th>Zona</th><th>Clientes</th><th>Informes</th><th>Acciones</th></tr></thead>
            <tbody>
              {ejs.map(e => (
                <tr key={e.id}>
                  <td><strong>{e.nom}</strong></td>
                  <td style={{fontSize:12,color:'var(--grt)'}}>{e.email || '—'}</td>
                  <td style={{fontSize:12,color:'var(--grt)'}}>{e.zona || '—'}</td>
                  <td style={{textAlign:'center'}}><span className="b bok">{getCliCountForEj(e.id)}</span></td>
                  <td style={{textAlign:'center'}}>{getInfCountForEj(e.id)}</td>
                  <td>
                    <button className="btn bgh bsm" onClick={() => openEdit(e.id)}>✏</button>{' '}
                    <button className="btn bgh bsm" style={{color:'var(--ro)'}} onClick={() => handleDelete(e.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar ejecutivo' : 'Registrar ejecutivo'}>
        <div className="fg2">
          <div><label className="flabel">Nombre *</label><input className="finput" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} /></div>
          <div><label className="flabel">Correo</label><input className="finput" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="nombre@proservis.co" /></div>
        </div>
        <label className="flabel">Regional / Zona</label>
        <input className="finput" value={form.zona} onChange={e => setForm({...form, zona: e.target.value})} />
        <div className="brow">
          <button className="btn bvd" onClick={handleSave}>Guardar</button>
          <button className="btn bgh" onClick={() => setModalOpen(false)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
