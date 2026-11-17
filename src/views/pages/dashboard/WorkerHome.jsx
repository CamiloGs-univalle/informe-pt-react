/**
 * views/pages/dashboard/WorkerHome.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Inicio de una persona de área (Selección, SST, Bienestar…): sin informes
 * ni equipos, solo lo suyo — qué clientes tiene asignados este período, en
 * qué estado está cada aporte y cuál es la siguiente acción.
 */
import PeriodPicker from '../../common/PeriodPicker';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { tareasDe } from '../../../models/Alcance';
import { getContribucion, ESTADOS, ESTADO_META } from '../../../models/Contribucion';
import { periodoActual, fmtNum, plural, fmtPerLong } from '../../../utils/format';
import EmptyState from '../../common/EmptyState';
import ClienteLogo from '../../common/ClienteLogo';
import InsightBanner from './InsightBanner';

export default function WorkerHome({ user }) {
  const [per, setPer] = useState(periodoActual());

  // Mismas tareas que ve la persona en "Mis aportes" (una sola definición: tareasDe).
  const filas = useMemo(() => tareasDe(user).map(({ cli, area }) => {
    const ct = getContribucion(cli.id, per, area.id);
    return { cli, area, estado: ct?.estado || ESTADOS.PENDIENTE, ct };
  }), [user, per]);

  const cuenta = (...estados) => filas.filter(f => estados.includes(f.estado)).length;
  const porCorregir = cuenta(ESTADOS.RECHAZADO);
  const porReportar = cuenta(ESTADOS.PENDIENTE, ESTADOS.EN_PROCESO);
  const enviados = cuenta(ESTADOS.COMPLETADO);
  const validados = cuenta(ESTADOS.VALIDADO);

  let insight;
  if (!filas.length) insight = { tone: 'warn', text: 'Todavía no tienes clientes asignados. Pídele a tu administrador que te asigne.' };
  else if (porCorregir) insight = { tone: 'bad', text: `${plural(porCorregir, 'aporte')} con correcciones pedidas por el ejecutivo.`, to: '/mis-contribuciones?tab=correcciones', cta: 'Corregir ahora' };
  else if (porReportar) insight = { tone: 'warn', text: `Te ${porReportar === 1 ? 'falta' : 'faltan'} ${plural(porReportar, 'cliente')} por reportar en ${fmtPerLong(per)}.`, to: '/mis-contribuciones', cta: 'Subir aportes' };
  else insight = { tone: 'good', text: 'Todo al día: ya enviaste tus aportes de este período.' };

  const orden = { [ESTADOS.RECHAZADO]: 0, [ESTADOS.PENDIENTE]: 1, [ESTADOS.EN_PROCESO]: 2, [ESTADOS.COMPLETADO]: 3, [ESTADOS.VALIDADO]: 4 };
  const lista = [...filas].sort((a, b) => orden[a.estado] - orden[b.estado] || a.cli.nom.localeCompare(b.cli.nom));

  return (
    <div>
      <div className="toolbar">
        <PeriodPicker value={per} onChange={setPer} max={periodoActual()} />
        <span className="count">{plural(filas.length, 'cliente')} asignados</span>
      </div>

      <InsightBanner insight={insight} />

      <div className="kgrid">
        <div className={'kpi' + (porReportar ? ' am' : '')}><div className="kl">Por reportar</div><div className="kv">{fmtNum(porReportar)}</div><div className="ks">Sin iniciar o en borrador</div></div>
        <div className={'kpi' + (porCorregir ? ' ro' : '')}><div className="kl">Con correcciones</div><div className="kv">{fmtNum(porCorregir)}</div><div className="ks">Devueltos por el ejecutivo</div></div>
        <div className="kpi"><div className="kl">Enviados</div><div className="kv">{fmtNum(enviados)}</div><div className="ks">Esperan validación</div></div>
        <div className="kpi"><div className="kl">Validados</div><div className="kv">{fmtNum(validados)}</div><div className="ks">Listos para el informe</div></div>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon="🗂️" title="Aún no tienes clientes asignados">
          Cuando tu administrador te asigne clientes aparecerán aquí con lo que debes reportar cada mes.
        </EmptyState>
      ) : (
        <div className="card">
          <div className="ct">Tus aportes de {fmtPerLong(per)}</div>
          <ul className="todo-list">
            {lista.map(({ cli, area, estado, ct }) => {
              const meta = ESTADO_META[estado];
              return (
                <li key={cli.id + (area?.id || '')} style={{ borderLeft: '4px solid ' + meta.color }}>
                  <ClienteLogo cli={cli} size={36} radius={8} />
                  <div className="todo-main">
                    <div className="todo-t text-ellipsis">{cli.nom}</div>
                    <div className="todo-s text-ellipsis">{area?.nombre}{estado === ESTADOS.RECHAZADO && ct?.obs ? ' · “' + ct.obs + '”' : ''}</div>
                  </div>
                  <span className="b" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  <Link to={`/mis-contribuciones?cliente=${cli.id}&per=${per}`} className={'btn bsm ' + (estado === ESTADOS.VALIDADO || estado === ESTADOS.COMPLETADO ? 'bgh' : 'bvd')}>
                    {estado === ESTADOS.VALIDADO || estado === ESTADOS.COMPLETADO ? 'Ver' : estado === ESTADOS.RECHAZADO ? 'Corregir' : 'Abrir'}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
