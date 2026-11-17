/**
 * services/pdf.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Export helpers that turn a rendered Informe HTML string into a
 * downloadable PDF (via `html2pdf.js`) or HTML file.
 *
 * (Moved from the previous flat `src/pdfGenerator.js`, same behaviour.)
 */

/** Renders `htmlContent` off-screen and saves it as a PDF via html2pdf.js. */
export async function generatePDF(htmlContent, filename) {
  await renderPDF(htmlContent, filename, 'save');
}

/** Igual que `generatePDF`, pero devuelve el PDF como Blob (para adjuntarlo a un correo) en vez de descargarlo. */
export async function generatePDFBlob(htmlContent, filename) {
  return renderPDF(htmlContent, filename, 'blob');
}

async function renderPDF(htmlContent, filename, salida) {
  const { default: html2pdf } = await import('html2pdf.js'); // se descarga solo al exportar
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Informes con el diseño nuevo (raíz `.rpt`): modo PDF = todas las secciones seguidas, ancho fijo, vertical.
  // Los informes viejos ya guardados no tienen esa raíz y se exportan como antes.
  const rpt = container.querySelector('.rpt');
  if (rpt) {
    rpt.classList.add('rpt-pdf');
    container.style.width = '733px'; // A4 vertical (210 mm) menos márgenes de 8 mm, a 96 dpi
    container.querySelectorAll('details').forEach(d => { d.open = true; });
    container.querySelectorAll('tr.seg-row').forEach(r => r.classList.add('on'));
    // html2canvas recorta los SVG que solo tienen viewBox: se pasan a imagen PNG del mismo tamaño.
    // (Los colores y trazos de las gráficas van en atributos, así que no dependen del CSS.)
    const ser = new XMLSerializer();
    const svgs = [...container.querySelectorAll('svg')];
    await Promise.all(svgs.map(async svg => {
      const r = svg.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return;
      const w = Math.round(r.width); const h = Math.round(r.height);
      const origen = new Image();
      origen.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ser.serializeToString(svg));
      try { await origen.decode(); } catch { return; }
      const cv = document.createElement('canvas');
      cv.width = w * 2; cv.height = h * 2;
      cv.getContext('2d').drawImage(origen, 0, 0, cv.width, cv.height);
      const img = document.createElement('img');
      img.src = cv.toDataURL('image/png');
      img.alt = svg.getAttribute('aria-label') || '';
      img.style.cssText = `display:block;margin:0 auto;width:${w}px;height:${h}px`;
      svg.replaceWith(img);
    }));
  } else {
    container.style.width = '100%';
  }

  const opt = {
    margin: rpt ? [8, 8, 8, 8] : 0,
    filename: filename || 'informe.pdf',
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: !rpt },
    jsPDF: { unit: 'mm', format: 'a4', orientation: rpt ? 'portrait' : 'landscape' },
    // Diseño nuevo: solo se evita partir tarjetas/filas (no contenedores enteros) y cada sección empieza en página nueva.
    pagebreak: rpt
      ? { mode: ['css'], avoid: ['.card', '.kpi', '.col', '.titular', '.lectura', '.mod-hd', 'details', 'tr', '.foto', '.hero', '.pie'] }
      : { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    if (salida === 'blob') return await html2pdf().set(opt).from(container).outputPdf('blob');
    await html2pdf().set(opt).from(container).save();
    return null;
  } finally {
    document.body.removeChild(container);
  }
}

/** Triggers a browser download of `html` as a standalone `.html` file. */
export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'informe.html';
  a.click();
  URL.revokeObjectURL(url);
}
