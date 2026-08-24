import { useState, useEffect } from "react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { getClis, getEjs, getInfs, saveCli, deleteCli, getInfCountForCli, fmtPer } from "../store";

export default function AdminClientes() {
  const toast = useToast();
  const [clis, setClis] = useState([]);
  const [ejs, setEjs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom:'', nit:'', ciu:'', marca:'', sec:'', ejId:'' });

  const reload = () => { setClis(getClis()); setEjs(getEjs()); };
  useEffect(() => { reload(); }, []);

  const openNew = () => { setEditId(null); setForm({ nom:'', nit:'', ciu:'', marca:'', sec:'', ejId:'' }); setModalOpen(true); };
  const openEdit = (id) => {
    const c = getClis().find(x => x.id === id);
    if (c) { setEditId(id); setForm({ nom:c.nom, nit:c.nit||'', ciu:c.ciu||'', marca:c.marca||'', sec:c.sec||'', ejId:c.ejId||'' }); setModalOpen(true); }
  };

  const handleSave = () => {
    if (!form.nom.trim()) { toast('⚠ Nombre obligatorio'); return; }
    saveCli({ id: editId, ...form });
    toast(editId ? 'Cliente actualizado ✓' : 'Cliente creado ✓');
    setModalOpen(false); reload();
  };

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    deleteCli(id); toast('Cliente eliminado'); reload();
  };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
        <div><div className="ph">Gestionar clientes</div><div className="ps" style={{marginBottom:0}}>Administra clientes y asignaciones</div></div>
        <button className="btn bvd" onClick={openNew}>+ Nuevo cliente</button>
      </div>
      <div className="card">
        <div className="ct">Clientes ({clis.length})</div>
        <div style={{overflowX:'auto'}}>
          <table className="tbl">
            <thead><tr><th>Cliente</th><th>Ciudad</th><th>Ejecutivo</th><th>Informes</th><th>Último</th><th>Acciones</th></tr></thead>
            <tbody>
              {clis.map(c => {
                const ej = getEjs().find(e => e.id === c.ejId);
                const ni = getInfCountForCli(c.id);
                const infs = getInfs().filter(i => i.cliId === c.id);
                const ult = infs.length ? fmtPer(infs[infs.length - 1].per) : '—';
                return (
                  <tr key={c.id}>
                    <td><strong>{c.nom}</strong>{c.marca ? <><br/><span style={{fontSize:11,color:'var(--grt)'}}>{c.marca}</span></> : ''}</td>
                    <td style={{fontSize:12}}>{c.ciu || '—'}</td>
                    <td>{ej ? <span className="b bok">{ej.nom}</span> : <span className="b bgr">Sin asignar</span>}</td>
                    <td style={{textAlign:'center'}}>{ni}</td>
                    <td style={{fontSize:11,color:'var(--grt)'}}>{ult}</td>
                    <td>
                      <button className="btn bgh bsm" onClick={() => openEdit(c.id)}>✏</button>{' '}
                      <button className="btn bgh bsm" style={{color:'var(--ro)'}} onClick={() => handleDelete(c.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar cliente' : 'Registrar cliente'}>
        <label className="flabel">Nombre *</label>
        <input className="finput" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ej: Incubadora Santander" />
        <div className="fg2">
          <div><label className="flabel">NIT</label><input className="finput" value={form.nit} onChange={e => setForm({...form, nit: e.target.value})} placeholder="890.000.000-1" /></div>
          <div><label className="flabel">Ciudad</label><input className="finput" value={form.ciu} onChange={e => setForm({...form, ciu: e.target.value})} placeholder="Bucaramanga" /></div>
        </div>
        <label className="flabel">Nombre comercial / Marca</label>
        <input className="finput" value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} placeholder="Ej: Huevos Kikes" />
        <label className="flabel">Sector</label>
        <input className="finput" value={form.sec} onChange={e => setForm({...form, sec: e.target.value})} placeholder="Alimentos, Manufactura..." />
        <label className="flabel">Ejecutivo asignado</label>
        <select className="finput" value={form.ejId} onChange={e => setForm({...form, ejId: e.target.value})}>
          <option value="">— Sin asignar —</option>
          {ejs.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
        <div className="brow">
          <button className="btn bvd" onClick={handleSave}>Guardar</button>
          <button className="btn bgh" onClick={() => setModalOpen(false)}>Cancelar</button>
        </div>
      </Modal>
    </div>
  );
}
