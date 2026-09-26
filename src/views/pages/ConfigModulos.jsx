/**
 * views/pages/ConfigModulos.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Lets a Usuario choose which report modules are active by default, and
 * optionally override that per cliente.
 */
import { useState, useEffect } from 'react';
import { MODULOS } from '../../models/constants';
import { getModuloConfig, saveModuloConfig, getModuloConfigForClient, saveModuloConfigForClient } from '../../models/ModuloConfig';
import { getClisForEj, getClis } from '../../models/Cliente';
import { getEjs } from '../../models/Ejecutivo';
import { useToast } from '../common/useToast';

export default function ConfigModulos({ user }) {
  const toast = useToast();
  const isSuper = user?.role === 'super_admin';
  const [targetUserId, setTargetUserId] = useState(user?.id);
  const [cfg, setCfg] = useState(() => getModuloConfig(targetUserId));
  const [targetUser, setTargetUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [selCli, setSelCli] = useState('');
  const [cliCfg, setCliCfg] = useState(null);

  useEffect(() => {
    const allEjs = getEjs();
    if (isSuper) {
      setAllUsers(allEjs.filter(u => u.role !== 'super_admin'));
    }
    const clis = targetUserId ? (getClisForEj(targetUserId).length ? getClisForEj(targetUserId) : getClis().slice(0, 5)) : [];
    setClientes(clis);
    setTargetUser(allEjs.find(u => u.id === targetUserId) || user);
    setCfg(getModuloConfig(targetUserId));
  }, [targetUserId, isSuper, user]);

  useEffect(() => {
    if (selCli) setCliCfg(getModuloConfigForClient(targetUserId, selCli));
    else setCliCfg(null);
  }, [selCli, targetUserId]);

  const toggle = (id) => {
    const next = { ...cfg, [id]: !cfg[id] };
    setCfg(next);
  };
  const save = () => {
    saveModuloConfig(targetUserId, cfg);
    toast(`Configuración guardada para ${targetUser?.nom || 'usuario'} Señor`);
  };
  const toggleCli = (id) => {
    const next = { ...cliCfg, [id]: !cliCfg[id] };
    setCliCfg(next);
  };
  const saveCli = () => {
    if (!selCli) return;
    saveModuloConfigForClient(targetUserId, selCli, cliCfg);
    toast('Configuración por cliente guardada');
  };
  const allOn = () => setCfg(Object.fromEntries(MODULOS.map(m => [m.id, true])));
  const allOff = () => setCfg(Object.fromEntries(MODULOS.map(m => [m.id, false])));

  const activeCount = Object.values(cfg).filter(Boolean).length;

  return (
    <div>
      <div className="ph">Configurar Módulos 
        {isSuper ? (
          <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600, marginLeft: 8 }}>
            Super Admin · Configura para cualquier usuario
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600 }}>Usuario · Se guarda para la próxima</span>
        )}
      </div>
      <div className="ps">{isSuper 
        ? 'Como Super Admin, puedes configurar los módulos de cualquier usuario del sistema. Selecciona un usuario abajo.'
        : 'El usuario elige qué módulos aparecen en su informe. La configuración queda guardada y la próxima vez ya está lista. Puede tener una config global y una por cliente.'}
      </div>

      {isSuper && (
        <div className="card" style={{ borderTop: '3px solid #12212D', background: '#FAFAFA', marginBottom: 14 }}>
          <div className="ct">👤 Seleccionar usuario a configurar</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="finput" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} style={{ minWidth: 300, maxWidth: 400 }}>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.nom} {u.role === 'admin' ? '◆ Admin' : ''} — {u.email} {u.activo === false && '(inactivo)'}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: '#12212D', fontWeight: 700 }}>
              Usuario actual: <strong>{targetUser?.nom}</strong> ({targetUser?.role})
            </span>
          </div>
        </div>
      )}

      <div className="kgrid">
        <div className="kpi" style={{ borderLeftColor: '#168A43' }}><div className="kl">Módulos activos</div><div className="kv">{activeCount}/{MODULOS.length}</div><div className="ks">Config global</div></div>
        <div className="kpi am"><div className="kl">Cliente seleccionado</div><div className="kv" style={{ fontSize: 14 }}>{selCli ? (clientes.find(c => c.id === selCli)?.nom || selCli) : 'Global'}</div><div className="ks">{selCli ? 'Config específica' : 'Aplica a todos'}</div></div>
        <div className="kpi"><div className="kl">Usuario</div><div className="kv" style={{ fontSize: 14 }}>{targetUser?.nom}</div><div className="ks">{targetUser?.email} {targetUser?.role === 'admin' && '◆ Admin'}</div></div>
      </div>

      <div className="card" style={{ borderTop: '3px solid #168A43' }}>
        <div className="ct">⚙️ Configuración global — mis módulos</div>
        <div style={{ fontSize: 11, color: 'var(--grt)', marginBottom: 12 }}>Activa/desactiva los módulos que quieres incluir por defecto en todos tus informes. Esto se guarda automáticamente y no tienes que volver a configurarlo.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn bgh bsm" onClick={allOn}>Activar todo</button>
          <button className="btn bgh bsm" onClick={allOff}>Desactivar todo</button>
          <button className="btn bvd bsm" onClick={save} style={{ marginLeft: 'auto' }}>💾 Guardar configuración global</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
          {MODULOS.map(m => (
            <label key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: cfg[m.id] ? 'var(--vc)' : 'var(--gr)', border: cfg[m.id] ? '1.5px solid #C8E6D4' : '1.5px solid var(--grb)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all .15s' }}>
              <input type="checkbox" checked={!!cfg[m.id]} onChange={() => toggle(m.id)} style={{ width: 18, height: 18, accentColor: '#168A43' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center' }}><span>{m.icon}</span>{m.label} {cfg[m.id] && <span className="b bok" style={{ fontSize: 9, marginLeft: 6 }}>Activo</span>}</div>
                <div style={{ fontSize: 11, color: 'var(--grt)' }}>{m.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="alrt avd" style={{ marginTop: 12, fontSize: 11 }}>Esta configuración se usa en <strong>Nuevo informe</strong> para decidir qué secciones mostrar para <strong>{targetUser?.nom}</strong>. Si desactivas un módulo, no se pedirá ni se exportará.</div>
      </div>

      <div className="card" style={{ borderTop: '3px solid #E8BB26' }}>
        <div className="ct">🎯 Configuración por cliente (opcional)</div>
        <div style={{ fontSize: 11, color: 'var(--grt)', marginBottom: 10 }}>Si un cliente necesita módulos distintos, selecciónalo y personaliza. Si no eliges nada, se usa la global.</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select className="finput" value={selCli} onChange={e => setSelCli(e.target.value)} style={{ maxWidth: 280 }}>
            <option value="">— Seleccionar cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nom}{c.marca ? ' · ' + c.marca : ''}</option>)}
          </select>
          {selCli && <button className="btn bvd bsm" onClick={saveCli}>💾 Guardar por cliente</button>}
          {selCli && <button className="btn bgh bsm" onClick={() => { setSelCli(''); }}>Limpiar</button>}
        </div>
        {selCli && cliCfg && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
            {MODULOS.map(m => (
              <label key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: cliCfg[m.id] ? '#FDF6D8' : 'var(--gr)', border: '1px solid var(--grb)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!cliCfg[m.id]} onChange={() => toggleCli(m.id)} style={{ accentColor: '#E8BB26' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{m.icon} {m.label}</span>
              </label>
            ))}
          </div>
        )}
        {!selCli && <div style={{ background: 'var(--gr)', border: '1px dashed var(--grb)', borderRadius: 8, padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--grt)' }}>Selecciona un cliente arriba para personalizar sus módulos.</div>}
      </div>

      <div className="card" style={{ background: 'var(--vc)', border: '1px solid #C8E6D4' }}>
        <div className="ct">👁 Vista previa — cómo quedará tu informe</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MODULOS.filter(m => cfg[m.id]).map(m => (
            <span key={m.id} className="b bok" style={{ padding: '6px 10px', fontSize: 11 }}>{m.icon} {m.label}</span>
          ))}
          {activeCount === 0 && <span className="b bbd">Ningún módulo activo — el informe saldrá vacío</span>}
        </div>
        <div style={{ fontSize: 11, color: '#0F6B33', marginTop: 8 }}>{activeCount} módulos se incluirán en el PDF/HTML para <strong>{targetUser?.nom}</strong>. La próxima vez que <strong>{targetUser?.nom}</strong> entre a <strong>Nuevo informe</strong>, ya verá esta configuración cargada.</div>
      </div>
    </div>
  );
}
