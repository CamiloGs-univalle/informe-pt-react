import html2pdf from 'html2pdf.js';

export async function generatePDF(htmlContent, filename) {
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.width = '100%';
  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: filename || 'informe.pdf',
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadHTML(html, filename) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'informe.html';
  a.click();
  URL.revokeObjectURL(url);
}