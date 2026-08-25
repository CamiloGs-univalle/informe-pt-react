import { useState, useEffect } from "react";
import { getInfs, getClis, getCli, fmtPer, fmtPerLong, toast } from "../store";
import { generatePDF, downloadHTML } from "../pdfGenerator";

export default function Guardados() {
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [lista, setLista] = useState([]);

  useEffect(() => {
    const infs = getInfs();
    const clis = getClis();
    const merged = infs.map(inf => {
      const cli = clis.find(c => c.id === inf.cliId);
      return { ...inf, cliNom: cli?.nom || inf.cliNom || '—', cliMarca: cli?.marca || '' };
    }).sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    setLista(merged);
  }, []);

  const filtered = lista.filter(inf => {
    const matchSearch = !search || inf.cliNom.toLowerCase().includes(search.toLowerCase()) || (inf.per || '').includes(search);
    const matchMonth = !month || inf.per === month;
    return matchSearch && matchMonth;
  });

  const handleDownloadHTML = (inf) => {
    if (inf.html) {
      const filename = `Informe_${inf.cliNom}_${fmtPer(inf.per)}.html`;
      downloadHTML(inf.html, filename);
      toast('HTML descargado');
    }
  };

  const handleDownloadPDF = async (inf) => {
    if (inf.html) {
      const filename = `Informe_${inf.cliNom}_${fmtPer(inf.per)}.pdf`;
      try {
        await generatePDF(inf.html, filename);
        toast('PDF descargado');
      } catch(e) {
        toast('Error al generar PDF');
      }
    }
  };

  return (
    <div>
      <div className="ph">Informes Guardados</div>
      <div className="ps">Total: {filtered.length} informe{filtered.length !== 1 ? 's' : ''}</div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input className="finput" type="text" placeholder="Buscar por cliente o período..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <input className="finput" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ maxWidth: 180 }} />
      </div>

      {filtered.length === 0 && (
        <div className="card">
          <div className="alrt aam">📋 No hay informes guardados aún. Crea uno en "Nuevo informe".</div>
        </div>
      )}

      {filtered.map(inf => (
        <div key={inf.id} className="clcard" style={{ cursor: 'default' }}>
          <div className="clav">{inf.cliNom.slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="clnm">{inf.cliNom}{inf.cliMarca ? ' · ' + inf.cliMarca : ''}</div>
            <div className="clmt">{fmtPerLong(inf.per)} · {inf.ejNom || '—'} · {new Date(inf.ts).toLocaleDateString('es-CO')}</div>
          </div>
          <div className="clri">
            <button className="btn bvd bsm" onClick={() => handleDownloadHTML(inf)} disabled={!inf.html}>📄 HTML</button>
            <button className="btn bam bsm" onClick={() => handleDownloadPDF(inf)} disabled={!inf.html}>📑 PDF</button>
          </div>
        </div>
      ))}
    </div>
  );
}