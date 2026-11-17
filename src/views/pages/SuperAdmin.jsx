/**
 * views/pages/SuperAdmin.jsx  (menú: "Espacios y áreas")
 * ─────────────────────────────────────────────────────────────────────────
 * Solo super admin. Define la estructura de la empresa:
 *   Espacio → Áreas → módulos que aporta cada área y quién la administra.
 * Un área puede marcarse como "lidera el informe final": sus integrantes
 * (p. ej. los ejecutivos de cuenta) arman y entregan el informe del cliente;
 * las demás áreas aportan su parte y el líder la valida.
 */
import { useState } from 'react';
import { DB } from '../../models/db';
import { saveWorkspace, deleteWorkspace, saveArea, deleteArea } from '../../models/Workspace';
import { areaEsLider } from '../../models/Alcance';
import { MODULOS } from '../../models/constants';
import { fmtNum, plural } from '../../utils/format';
import { useToast, useConfirm } from '../common/useToast';
import PageHeader from '../common/PageHeader';
import EmptyState from '../common/EmptyState';
import Modal from '../common/Modal';

const WS_VACIO = { nombre: '', descripcion: '', color: '#168A43' };
const AREA_VACIA = { nombre: '', workspaceId: '', color: '#E8BB26', modulos: [], adminId: '', descripcion: '', lidera: false };

export default function SuperAdmin() {
  const toast = useToast();
  const confirmar = useConfirm();
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);
  const [fw, setFw] = useState(null);   // formulario de espacio (null = cerrado)
  const [editW, setEditW] = useState(null);
  const [fa, setFa] = useState(null);   // formulario de área
  const [editA, setEditA] = useState(null);

  const wss = DB.workspaces;
  const areas = DB.areas;
  const personasDe = (areaId) => DB.ejs.filter(e => e.areaId === areaId);
  const nombreDe = (id) => DB.ejs.find(e => e.id === id)?.nom;

  // ── Espacios ──
  const abrirNuevoW = () => { setFw({ ...WS_VACIO }); setEditW(null); };
  const abrirEditarW = (w) => { setFw({ nombre: w.nombre || '', descripcion: w.descripcion || '', color: w.color || '#168A43' }); setEditW(w.id); };
  const guardarW = () => {
    const nombre = fw.nombre.trim();
    if (!nombre) { toast('Escribe el nombre del espacio.', 'error'); return; }
    if (wss.some(w => w.id !== editW && w.nombre.trim().toLowerCase() === nombre.toLowerCase())) { toast('Ya existe un espacio con ese nombre.', 'error'); return; }
    saveWorkspace({ ...fw, nombre, id: editW || undefined });
    refresh(); setFw(null); toast(editW ? 'Espacio actualizado.' : 'Espacio creado.');
  };
  const eliminarW = async (w) => {
    const ars = areas.filter(a => a.workspaceId === w.id);
    const gente = ars.reduce((s, a) => s + personasDe(a.id).length, 0);
    const ok = await confirmar({
      title: `Eliminar el espacio «${w.nombre}»`,
      message: `Se eliminarán ${plural(ars.length, 'área')} y los aportes de esas áreas. ${gente ? `${plural(gente, 'persona')} quedará${gente === 1 ? '' : 'n'} sin área (no se borran).` : ''} Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar espacio', danger: true,
    });
    if (!ok) return;
    deleteWorkspace(w.id); refresh(); toast('Espacio eliminado.');
  };

  // ── Áreas ──
  const abrirNuevaA = (wsId) => { setFa({ ...AREA_VACIA, workspaceId: wsId || wss[0]?.id || '' }); setEditA(null); };
  const abrirEditarA = (a) => {
    setFa({ nombre: a.nombre || '', workspaceId: a.workspaceId || '', color: a.color || '#E8BB26', modulos: [...(a.modulos || [])], adminId: a.adminId || '', descripcion: a.descripcion || '', lidera: areaEsLider(a) });
    setEditA(a.id);
  };
  const guardarA = () => {
    const nombre = fa.nombre.trim();
    if (!nombre) { toast('Escribe el nombre del área.', 'error'); return; }
    if (!fa.workspaceId) { toast('Elige el espacio al que pertenece.', 'error'); return; }
    if (areas.some(a => a.id !== editA && a.workspaceId === fa.workspaceId && a.nombre.trim().toLowerCase() === nombre.toLowerCase())) { toast('Ese espacio ya tiene un área con ese nombre.', 'error'); return; }
    saveArea({ ...fa, nombre, id: editA || undefined });
    refresh(); setFa(null); toast(editA ? 'Área actualizada.' : 'Área creada.');
  };
  const eliminarA = async (a) => {
    const gente = personasDe(a.id).length;
    const aportes = DB.contribuciones.filter(c => c.areaId === a.id).length;
    const ok = await confirmar({
      title: `Eliminar el área «${a.nombre}»`,
      message: `${gente ? `${plural(gente, 'persona')} quedará${gente === 1 ? '' : 'n'} sin área. ` : ''}${aportes ? `Se borrarán ${plural(aportes, 'aporte')} de esta área. ` : ''}Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar área', danger: true,
    });
    if (!ok) return;
    deleteArea(a.id); refresh(); toast('Área eliminada.');
  };
  const alternarModulo = (mid) => setFa(f => ({ ...f, modulos: f.modulos.includes(mid) ? f.modulos.filter(m => m !== mid) : [...f.modulos, mid] }));
  const candidatosAdmin = DB.ejs.filter(e => e.activo !== false && (e.role === 'admin' || e.role === 'super_admin'));

  return (
    <div>
      <PageHeader
        title="Espacios y áreas"
        subtitle="Define cómo se organiza la empresa: qué áreas existen, qué parte del informe aporta cada una y quién la administra."
        actions={<>
          <button type="button" className="btn bgh" onClick={() => abrirNuevaA()} disabled={!wss.length} title={wss.length ? '' : 'Crea primero un espacio'}>+ Nueva área</button>
          <button type="button" className="btn bvd" onClick={abrirNuevoW}>+ Nuevo espacio</button>
        </>}
      />

      <div className="kgrid" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="kl">Espacios</div><div className="kv">{fmtNum(wss.length)}</div><div className="ks">Unidades de negocio</div></div>
        <div className="kpi am"><div className="kl">Áreas</div><div className="kv">{fmtNum(areas.length)}</div><div className="ks">{fmtNum(areas.filter(areaEsLider).length)} lideran el informe final</div></div>
        <div className="kpi"><div className="kl">Personas</div><div className="kv">{fmtNum(DB.ejs.length)}</div><div className="ks">{fmtNum(DB.ejs.filter(e => !e.areaId).length)} sin área</div></div>
      </div>

      {!wss.length && (
        <EmptyState icon="🏢" title="Aún no hay espacios" action={<button type="button" className="btn bvd" onClick={abrirNuevoW}>Crear el primer espacio</button>}>
          Un espacio agrupa las áreas de una unidad de negocio, por ejemplo «Proservis Temporales».
        </EmptyState>
      )}

      {wss.map(ws => {
        const ars = areas.filter(a => a.workspaceId === ws.id);
        return (
          <section key={ws.id} className="card ws-card">
            <div className="ws-head">
              <span className="ws-dot" style={{ background: ws.color }} aria-hidden="true" />
              <div className="ws-title">
                <h2>{ws.nombre}</h2>
                <div className="text-muted">{ws.descripcion || 'Sin descripción'} · {plural(ars.length, 'área')}</div>
              </div>
              <div className="row-acts">
                <button type="button" className="btn bvd bsm" onClick={() => abrirNuevaA(ws.id)}>+ Área aquí</button>
                <button type="button" className="btn bgh bsm" onClick={() => abrirEditarW(ws)}>Editar</button>
                <button type="button" className="btn bro bsm" onClick={() => eliminarW(ws)}>Eliminar</button>
              </div>
            </div>
            {!ars.length ? (
              <div className="text-muted" style={{ padding: '10px 2px' }}>Este espacio no tiene áreas. Usa «+ Área aquí» para crear la primera.</div>
            ) : (
              <div className="ws-areas">
                {ars.map(a => {
                  const gente = personasDe(a.id);
                  const lider = areaEsLider(a);
                  return (
                    <article key={a.id} className="area-card" style={{ borderLeftColor: a.color }}>
                      <div className="area-top">
                        <h3>{a.nombre}</h3>
                        {lider && <span className="chip am" title="Sus integrantes arman y entregan el informe final del cliente">Lidera el informe</span>}
                      </div>
                      {a.descripcion && <div className="text-muted">{a.descripcion}</div>}
                      <div className="area-meta"><strong>Módulos:</strong> {(a.modulos || []).length ? a.modulos.map(mid => MODULOS.find(m => m.id === mid)?.label || mid).join(' · ') : 'Ninguno'}</div>
                      <div className="area-meta"><strong>Administra:</strong> {a.adminId ? (nombreDe(a.adminId) || 'Persona eliminada') : 'Sin administrador'}</div>
                      <div className="area-meta"><strong>Integrantes:</strong> {fmtNum(gente.length)}</div>
                      <div className="row-acts" style={{ marginTop: 10 }}>
                        <button type="button" className="btn bgh bsm" onClick={() => abrirEditarA(a)}>Editar</button>
                        <button type="button" className="btn bro bsm" onClick={() => eliminarA(a)}>Eliminar</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <Modal open={!!fw} onClose={() => setFw(null)} title={editW ? 'Editar espacio' : 'Nuevo espacio'}>
        {fw && (<>
          <div><label className="flabel" htmlFor="w-n">Nombre *</label><input id="w-n" className="finput" value={fw.nombre} onChange={e => setFw({ ...fw, nombre: e.target.value })} placeholder="Ej. Proservis Temporales" autoFocus /></div>
          <div style={{ marginTop: 10 }}><label className="flabel" htmlFor="w-d">Descripción</label><input id="w-d" className="finput" value={fw.descripcion} onChange={e => setFw({ ...fw, descripcion: e.target.value })} placeholder="Para qué se usa este espacio" /></div>
          <div style={{ marginTop: 10 }}><label className="flabel" htmlFor="w-c">Color</label><input id="w-c" className="finput color-in" type="color" value={fw.color} onChange={e => setFw({ ...fw, color: e.target.value })} /></div>
          <div className="brow"><button type="button" className="btn bvd" onClick={guardarW}>{editW ? 'Guardar cambios' : 'Crear espacio'}</button><button type="button" className="btn bgh" onClick={() => setFw(null)}>Cancelar</button></div>
        </>)}
      </Modal>

      <Modal open={!!fa} onClose={() => setFa(null)} title={editA ? 'Editar área' : 'Nueva área'} wide>
        {fa && (<>
          <div className="fg2">
            <div><label className="flabel" htmlFor="a-n">Nombre *</label><input id="a-n" className="finput" value={fa.nombre} onChange={e => setFa({ ...fa, nombre: e.target.value })} placeholder="Ej. Seguridad y Salud en el Trabajo" autoFocus /></div>
            <div><label className="flabel" htmlFor="a-w">Espacio *</label><select id="a-w" className="finput" value={fa.workspaceId} onChange={e => setFa({ ...fa, workspaceId: e.target.value })}>{wss.map(w => <option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
          </div>
          <div className="fg2" style={{ marginTop: 10 }}>
            <div><label className="flabel" htmlFor="a-adm">Administrador del área</label>
              <select id="a-adm" className="finput" value={fa.adminId} onChange={e => setFa({ ...fa, adminId: e.target.value })}>
                <option value="">— Sin administrador —</option>
                {candidatosAdmin.map(e => <option key={e.id} value={e.id}>{e.nom} · {e.email}</option>)}
              </select>
            </div>
            <div><label className="flabel" htmlFor="a-c">Color</label><input id="a-c" className="finput color-in" type="color" value={fa.color} onChange={e => setFa({ ...fa, color: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 10 }}><label className="flabel" htmlFor="a-d">Descripción</label><input id="a-d" className="finput" value={fa.descripcion} onChange={e => setFa({ ...fa, descripcion: e.target.value })} placeholder="Qué hace esta área" /></div>

          <label className="chk lider-opt" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={fa.lidera} onChange={e => setFa({ ...fa, lidera: e.target.checked })} />
            <span><strong>Esta área lidera el informe final</strong><br /><span className="text-muted">Sus integrantes (ejecutivos de cuenta) arman el informe de sus clientes, validan lo que aportan las otras áreas y lo entregan.</span></span>
          </label>

          <div className="mdl-sub">Módulos que aporta esta área</div>
          <div className="mod-pick">
            {MODULOS.map(m => (
              <label key={m.id} className={'mod-pick-i' + (fa.modulos.includes(m.id) ? ' on' : '')} title={m.desc}>
                <input type="checkbox" checked={fa.modulos.includes(m.id)} onChange={() => alternarModulo(m.id)} />
                <span aria-hidden="true">{m.icon}</span> {m.label}
              </label>
            ))}
          </div>
          <div className="text-muted" style={{ marginTop: 6 }}>{fa.modulos.length ? `${plural(fa.modulos.length, 'módulo')} seleccionado${fa.modulos.length === 1 ? '' : 's'}.` : 'Sin módulos: el área no tendrá formularios de aporte.'}</div>
          <div className="brow"><button type="button" className="btn bvd" onClick={guardarA}>{editA ? 'Guardar cambios' : 'Crear área'}</button><button type="button" className="btn bgh" onClick={() => setFa(null)}>Cancelar</button></div>
        </>)}
      </Modal>
    </div>
  );
}
