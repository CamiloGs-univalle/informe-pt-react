/**
 * views/pages/EquipoAdmin.jsx  (menú: "Mi equipo")
 * ─────────────────────────────────────────────────────────────────────────
 * Seguimiento mensual del equipo de un admin (o de todos, si es super admin),
 * agrupado por área. Aquí NO se editan datos: cada tarjeta lleva a "Gestionar
 * clientes" (sus clientes) o a "Personas" (editarla), donde sí se puede.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DB } from '../../models/db';
import { getTeamMonthlyProgress } from '../../controllers/reportingController';
import { periodoActual, fmtNum, fmtDec, plural, fmtPerLong } from '../../utils/format';
import PageHeader from '../common/PageHeader';
import PeriodPicker from '../common/PeriodPicker';
import EmptyState from '../common/EmptyState';
import TeamPod from './equipo/TeamPod';

export default function EquipoAdmin({ user }) {
  const navigate = useNavigate();
  const [per, setPer] = useState(periodoActual);
  const [q, setQ] = useState('');

  const equipo = getTeamMonthlyProgress(user, per).filter(p => p.user.role !== 'super_admin' || user.role === 'super_admin');
  const infs = DB.infs;
  const filtrado = equipo.filter(p => !q.trim() || (p.user.nom + ' ' + (p.user.email || '')).toLowerCase().includes(q.trim().toLowerCase()));

  const grupos = new Map();
  filtrado.forEach(p => { const k = p.user.areaId || '__'; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(p); });
  const orden = DB.areas.map(a => a.id);
  const pods = [...grupos.entries()].map(([id, members]) => ({
    area: DB.areas.find(a => a.id === id) || { id, nombre: 'Sin área asignada', color: '#9AA6A0', descripcion: '' }, members: members.sort((a, b) => a.user.nom.localeCompare(b.user.nom)),
  })).sort((a, b) => (orden.indexOf(a.area.id) + 1 || 99) - (orden.indexOf(b.area.id) + 1 || 99));

  const conClientes = equipo.filter(p => p.total > 0);
  const avance = conClientes.length ? Math.round(conClientes.reduce((s, p) => s + p.pct, 0) / conClientes.length) : 0;
  const pendientes = equipo.reduce((s, p) => s + p.pend, 0);
  const sinAsignar = DB.clis.filter(c => !c.ejId).length;
  const ids = new Set(equipo.map(p => p.user.id));
  const calificados = infs.filter(i => ids.has(i.ejId) && i.rating);
  const calidad = calificados.length ? calificados.reduce((s, i) => s + i.rating, 0) / calificados.length : null;

  return (
    <div>
      <PageHeader title="Mi equipo" subtitle="Cómo va cada persona en el mes, agrupada por área. Entra a sus clientes o edítala desde cada tarjeta."
        actions={<><PeriodPicker value={per} onChange={setPer} max={periodoActual()} /><button type="button" className="btn bvd" onClick={() => navigate('/aejecutivos')}>Gestionar personas</button></>} />

      <div className="kgrid">
        <div className="kpi"><div className="kl">Personas</div><div className="kv">{fmtNum(equipo.length)}</div><div className="ks">{fmtNum(equipo.filter(p => p.user.activo !== false).length)} activas</div></div>
        <div className="kpi"><div className="kl">Avance de {fmtPerLong(per)}</div><div className="kv">{avance}%</div><div className="ks">Promedio de quienes tienen clientes</div></div>
        <div className={'kpi' + (pendientes ? ' am' : '')}><div className="kl">Pendientes del mes</div><div className="kv">{fmtNum(pendientes)}</div><div className="ks">Informes o aportes por entregar</div></div>
        <div className={'kpi' + (sinAsignar ? ' ro' : '')}><div className="kl">Clientes sin líder</div><div className="kv">{fmtNum(sinAsignar)}</div><div className="ks">{sinAsignar ? <button type="button" className="link-btn" onClick={() => navigate('/aclientes')}>Asignar ahora →</button> : 'Todos tienen ejecutivo'}</div></div>
        <div className="kpi am"><div className="kl">Calidad del equipo</div><div className="kv">{calidad != null ? fmtDec(calidad) + ' ★' : '—'}</div><div className="ks">{calidad != null ? plural(calificados.length, 'informe calificado', 'informes calificados') : 'Aún sin calificaciones'}</div></div>
      </div>

      <div className="toolbar">
        <input className="finput grow" type="search" placeholder="Buscar persona por nombre o correo…" value={q} onChange={e => setQ(e.target.value)} aria-label="Buscar persona" />
        <span className="count">{plural(filtrado.length, 'persona')}</span>
      </div>

      {!pods.length ? (
        <EmptyState icon="👥" title={q ? 'Nadie coincide con la búsqueda' : 'Todavía no hay equipo'}
          action={!q ? <button type="button" className="btn bvd" onClick={() => navigate('/aejecutivos')}>Registrar personas</button> : null}>
          {q ? 'Prueba con otro nombre o correo.' : 'Registra a las personas de tus áreas para hacerles seguimiento.'}
        </EmptyState>
      ) : pods.map(g => (
        <TeamPod key={g.area.id} area={g.area} members={g.members} allInfs={infs}
          onClientes={(id) => navigate('/aclientes?persona=' + id)} onEdit={(id) => navigate('/aejecutivos?editar=' + id)} />
      ))}
    </div>
  );
}
