import { useState, useEffect } from 'react';
import { getInfs, deleteInf, updateInfRating } from '../../models/Informe';
import { getClis } from '../../models/Cliente';
import { fmtPer, fmtPerLong } from '../../utils/format';
import { useToast } from '../common/useToast';
import { generatePDF, downloadHTML } from '../../services/pdf.service';
import Modal from '../common/Modal';
import Stars from '../common/Stars';


export default function Guardados() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [lista, setLista] = useState([]);
  const [rateModal, setRateModal] = useState(null);
  const [rateVal, setRateVal] = useState(0);
  const [rateFeed, setRateFeed] = useState('');

  const refresh = () => {
    const infs = getInfs();
    const clis = getClis();
    const merged = infs.map(inf => {
      const cli = clis.find(c => c.id === inf.cliId);
      return { ...inf, cliNom: cli?.nom || inf.cliNom || '—', cliMarca: cli?.marca || '' };
    }).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    setLista(merged);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = lista.filter(inf => {
    const matchSearch = !search || inf.cliNom.toLowerCase().includes(search.toLowerCase()) || (inf.per || '').includes(search);
    const matchMonth = !month || inf.per === month;
    return matchSearch && matchMonth;
  });

  const avgRating = lista.length ? (lista.filter(i => i.rating).reduce((s, i) => s + i.rating, 0) / Math.max(1, lista.filter(i => i.rating).length)).toFixed(1) : '—';

  const handleDownloadHTML = (inf) => {
    if (inf.html) {
      const filename = `Informe_${inf.cliNom}_${fmtPer(inf.per)}.html`;
      downloadHTML(inf.html, filename);
      toast('HTML descargado Señor');
    }
  };

  const handleDownloadPDF = async (inf) => {
    if (inf.html) {
      const filename = `Informe_${inf.cliNom}_${fmtPer(inf.per)}.pdf`;
      try { await generatePDF(inf.html, filename); toast('PDF descargado Señor'); }
      catch (e) { toast('Error al generar PDF'); }
    }
  };

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este informe del historial?')) return;
    deleteInf(id); refresh(); toast('Informe eliminado');
  };

  const openRate = (inf) => { setRateModal(inf); setRateVal(inf.rating || 0); setRateFeed(inf.feedback || ''); };
  const saveRate = () => {
    if (!rateModal || !rateVal) { toast('Selecciona una calificación'); return; }
    updateInfRating(rateModal.id, rateVal, rateFeed);
    setRateModal(null); refresh(); toast('¡Calificación guardada Señor! ★');
  };

  return (
    <div>
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>Historial — Informes Guardados <span style={{ fontSize: 11, color: 'var(--grt)', fontWeight: 600, marginLeft: 8 }}>{filtered.length} informes</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <span style={{ background: '#FDF6D8', color: '#7A6010', padding: '4px 10px', borderRadius: 20, fontWeight: 700, border: '1px solid #E8BB26' }}>★ Promedio: {avgRating}</span>
        </div>
      </div>
      <div className="ps">Cada informe es inmutable. Aquí puedes calificar (★) y dejar feedback del cliente para mejora continua.</div>

      <div className="kgrid" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="kl">Total informes</div><div className="kv">{lista.length}</div><div className="ks">Histórico completo</div></div>
        <div className="kpi am"><div className="kl">Calificados</div><div className="kv">{lista.filter(i => i.rating).length}</div><div className="ks">Con estrellas</div></div>
        <div className="kpi"><div className="kl">Este mes</div><div className="kv">{lista.filter(i => { const mc = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'); return i.per === mc; }).length}</div><div className="ks">Período actual</div></div>
        <div className="kpi" style={{ borderLeftColor: '#E8BB26' }}><div className="kl">Calidad promedio</div><div className="kv" style={{ fontSize: 22 }}>{avgRating !== '—' ? avgRating + ' ★' : '—'}</div><div className="ks">Sobre 5.0</div></div>
      </div>

      <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="finput" type="text" placeholder="Buscar por cliente o período..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <input className="finput" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 180 }} />
        {(search || month) && <button className="btn bgh bsm" onClick={() => { setSearch(''); setMonth(''); }}>Limpiar filtros</button>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--grt)' }}>{filtered.length} de {lista.length}</span>
      </div>

      {filtered.length === 0 && (
        <div className="card"><div className="alrt aam">📋 No hay informes guardados aún. Crea uno en "Nuevo informe".</div></div>
      )}

      {filtered.map(inf => (
        <div key={inf.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: inf.rating ? '4px solid #E8BB26' : '4px solid #E6EBE6' }}>
          <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div className="clav" style={{ width: 42, height: 42, fontSize: 13 }}>{inf.cliNom.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{inf.cliNom}{inf.cliMarca ? ' · ' + inf.cliMarca : ''}</span>
                <span className="b bok" style={{ fontSize: 10 }}>{fmtPerLong(inf.per)}</span>
                {inf.activeModules && <span style={{ fontSize: 10, color: 'var(--grt)' }}>{inf.activeModules.length} módulos</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 3 }}>{inf.ejNom || '—'} · {new Date(inf.ts).toLocaleDateString('es-CO')} {new Date(inf.ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
              {inf.rating ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Stars value={inf.rating} readonly size={14} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7A6010' }}>{inf.rating}.0/5</span>
                  {inf.feedback && <span style={{ fontSize: 11, color: 'var(--grt)', fontStyle: 'italic', background: 'var(--amc)', padding: '3px 8px', borderRadius: 20, border: '1px solid #E8BB26' }}>“{inf.feedback}”</span>}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}><button className="btn bgh bsm" onClick={() => openRate(inf)} style={{ fontSize: 11 }}>☆ Calificar este informe</button></div>
              )}
              {inf.obs && <div style={{ fontSize: 11, color: 'var(--grt)', marginTop: 6, background: 'var(--gr)', padding: '6px 10px', borderRadius: 8 }}>{inf.obs}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn bvd bsm" onClick={() => handleDownloadHTML(inf)} disabled={!inf.html}>📄 HTML</button>
                <button className="btn bam bsm" onClick={() => handleDownloadPDF(inf)} disabled={!inf.html}>📑 PDF</button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn bgh bsm" onClick={() => openRate(inf)}>{inf.rating ? '✏️ Editar calificación' : '★ Calificar'}</button>
                <button className="btn bro bsm" onClick={() => handleDelete(inf.id)}>🗑️</button>
              </div>
            </div>
          </div>
          {inf.html && (
            <div style={{ background: 'var(--gr)', padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center', borderTop: '1px solid var(--grb)' }}>
              <span style={{ fontSize: 10, color: 'var(--grt)', fontWeight: 700, textTransform: 'uppercase' }}>Módulos incluidos:</span>
              {(inf.activeModules || ['headcount', 'seleccion', 'rotacion', 'sst', 'nomina', 'fotos']).map(m => (
                <span key={m} className="b bgr" style={{ fontSize: 9 }}>{m}</span>
              ))}
              {!inf.activeModules && <span style={{ fontSize: 10, color: 'var(--grt)' }}>(clásico — 6 módulos)</span>}
            </div>
          )}
        </div>
      ))}

      <Modal open={!!rateModal} onClose={() => setRateModal(null)} title={rateModal ? 'Calificar informe · ' + rateModal.cliNom : 'Calificar'}>
        <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
          <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 8 }}>¿Cómo le fue al cliente con este informe?</div>
          <Stars value={rateVal} onChange={setRateVal} size={32} />
          <div style={{ fontSize: 11, color: rateVal ? '#7A6010' : 'var(--grt)', marginTop: 6, fontWeight: 700 }}>
            {rateVal === 0 && 'Selecciona de 1 a 5 estrellas'}
            {rateVal === 1 && '★ Muy deficiente — requiere rehacer'}
            {rateVal === 2 && '★★ Deficiente — faltaron datos clave'}
            {rateVal === 3 && '★★★ Aceptable — con oportunidades'}
            {rateVal === 4 && '★★★★ Bueno — le gustó'}
            {rateVal === 5 && '★★★★★ ¡Excelente! — superó expectativas'}
          </div>
        </div>
        <label className="flabel">Comentario / feedback del cliente</label>
        <textarea className="finput" value={rateFeed} onChange={e => setRateFeed(e.target.value)} placeholder="Ej. Le encantó el diseño, pedir más detalle en ausentismo para el próximo mes..." rows={3} />
        <div style={{ fontSize: 10, color: 'var(--grt)', marginTop: 6 }}>Este comentario quedará visible para el ejecutivo y servirá para mejorar la próxima entrega.</div>
        <div className="brow"><button className="btn bvd" onClick={saveRate} disabled={!rateVal}>★ Guardar calificación</button><button className="btn bgh" onClick={() => setRateModal(null)}>Cancelar</button></div>
      </Modal>
    </div>
  );
}
