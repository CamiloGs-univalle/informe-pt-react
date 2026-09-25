/**
 * services/chart.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Generadores SVG puros para informes — sin dependencias externas.
 * Todos retornan strings SVG listos para inyectar en HTML/PDF.
 * Paleta corporativa Proservis: verde #168A43, amarillo #E8BB26, rojo #C0392B
 */

const PALETTE = ['#168A43', '#2196F3', '#E8BB26', '#C0392B', '#7B68EE', '#00BFA5', '#FF6F00', '#607D8B', '#9C27B0', '#0097A7'];
const PALETTE_SOFT = ['#E8F5EE', '#E3F2FD', '#FDF6D8', '#FDF0EE', '#EDE7F6', '#E0F2F1', '#FFF3E0', '#ECEFF1', '#F3E5F5', '#E0F7FA'];

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── DONUT ──
// values: [{label, value, color?}]
export function donutSVG(values, opts = {}) {
  const size = opts.size || 180;
  const thickness = opts.thickness || 28;
  const cx = size/2, cy = size/2, r = size/2 - 4;
  const rInner = r - thickness;
  const total = values.reduce((a,b)=>a+(Number(b.value)||0),0) || 1;
  let angle = -90;
  let paths = '';
  values.forEach((v,i)=>{
    const pct = (Number(v.value)||0)/total;
    if(pct<=0) return;
    const sweep = pct*360;
    const large = sweep>180?1:0;
    const a0 = angle*Math.PI/180, a1 = (angle+sweep)*Math.PI/180;
    const x0=cx+r*Math.cos(a0), y0=cy+r*Math.sin(a0), x1=cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const x2=cx+rInner*Math.cos(a1), y2=cy+rInner*Math.sin(a1), x3=cx+rInner*Math.cos(a0), y3=cy+rInner*Math.sin(a0);
    const col = v.color || PALETTE[i%PALETTE.length];
    if(pct>=0.999) {
      paths+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${thickness}" />`;
    } else {
      paths+=`<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${rInner} ${rInner} 0 ${large} 0 ${x3} ${y3} Z" fill="${col}" />`;
    }
    angle+=sweep;
  });
  const centerText = opts.centerText || '';
  const centerSub = opts.centerSub || '';
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img">
    ${paths}
    ${centerText?`<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="22" font-weight="800" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${esc(centerText)}</text>`:''}
    ${centerSub?`<text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9" font-weight="700" fill="#5A6A5A" font-family="Segoe UI,Arial,sans-serif">${esc(centerSub)}</text>`:''}
  </svg>`;
}

export function donutLegendSVG(values) {
  if(!values.length) return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">'+values.map((v,i)=>{
    const col=v.color||PALETTE[i%PALETTE.length];
    return `<span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;color:#12212D"><span style="width:11px;height:11px;border-radius:3px;background:${col};display:inline-block"></span>${esc(v.label)} <strong>${v.value}</strong> (${Math.round(v.value/ (values.reduce((a,b)=>a+(Number(b.value)||0),0)||1)*100)}%)</span>`;
  }).join('')+'</div>';
}

// ── BARRA HORIZONTAL ──
// items: [{label, value, color?}]
export function hBarSVG(items, opts={}) {
  const W = opts.width||520, barH=22, gap=10, labelW=150, rightW=50, padL=10, padR=10;
  const max = Math.max(...items.map(i=>Number(i.value)||0),1);
  const H = items.length*(barH+gap)+20;
  let y=14;
  let rows='';
  items.forEach((it,i)=>{
    const pct = (Number(it.value)||0)/max;
    const bw = (W-labelW-rightW-padL-padR)*pct;
    const col = it.color||PALETTE[i%PALETTE.length];
    const bg = PALETTE_SOFT[i%PALETTE_SOFT.length];
    rows+=`<text x="${padL}" y="${y+15}" font-size="11" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${esc(it.label.length>22?it.label.slice(0,22)+'…':it.label)}</text>`;
    rows+=`<rect x="${labelW}" y="${y}" rx="6" ry="6" width="${W-labelW-rightW-padR}" height="${barH}" fill="${bg}" />`;
    rows+=`<rect x="${labelW}" y="${y}" rx="6" ry="6" width="${bw}" height="${barH}" fill="${col}" />`;
    const txtColor = pct>0.45?'#fff':'#12212D';
    if(bw>28) rows+=`<text x="${labelW+bw-8}" y="${y+15}" text-anchor="end" font-size="11" font-weight="700" fill="${txtColor}" font-family="Segoe UI,Arial,sans-serif">${it.value}</text>`;
    else rows+=`<text x="${labelW+bw+6}" y="${y+15}" font-size="11" font-weight="700" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${it.value}</text>`;
    rows+=`<text x="${W-padR}" y="${y+15}" text-anchor="end" font-size="10" fill="#5A6A5A" font-family="Segoe UI,Arial,sans-serif">${Math.round(pct*100)}%</text>`;
    y+=barH+gap;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${rows}</svg>`;
}

// ── BARRA VERTICAL ──
// items: [{label, value, color?}]
export function vBarSVG(items, opts={}) {
  const W = opts.width||520, H= opts.height||220, padL=40, padR=16, padT=20, padB=36;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const max=Math.max(...items.map(i=>Number(i.value)||0),1)*1.15;
  const bw = Math.min(48, plotW/items.length*0.62);
  const gap = (plotW - bw*items.length)/(items.length+1);
  let bars='', labels='', grid='';
  // grid lines
  for(let g=0;g<=4;g++){
    const y=padT+plotH - (plotH/4)*g;
    const val=Math.round(max/4*g);
    grid+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#E8EAE8" stroke-dasharray="4 4"/>`;
    grid+=`<text x="${padL-8}" y="${y+4}" text-anchor="end" font-size="9" fill="#5A6A5A" font-family="Segoe UI,Arial,sans-serif">${val}</text>`;
  }
  items.forEach((it,i)=>{
    const h = (Number(it.value)||0)/max*plotH;
    const x=padL+gap+i*(bw+gap);
    const y=padT+plotH-h;
    const col=it.color||PALETTE[i%PALETTE.length];
    bars+=`<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${col}" />`;
    if(h>18) bars+=`<text x="${x+bw/2}" y="${y+14}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" font-family="Segoe UI,Arial,sans-serif">${it.value}</text>`;
    else bars+=`<text x="${x+bw/2}" y="${y-6}" text-anchor="middle" font-size="10" font-weight="700" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${it.value}</text>`;
    // label with wrap
    const lbl=esc(it.label);
    labels+=`<text x="${x+bw/2}" y="${H-10}" text-anchor="middle" font-size="9" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${lbl.length>14?lbl.slice(0,14)+'…':lbl}</text>`;
  });
  // axes
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#fff" stroke="#E8EAE8"/>
    ${grid}
    ${bars}
    ${labels}
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT+plotH}" stroke="#DDE4DD"/>
    <line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="#DDE4DD"/>
  </svg>`;
}

// ── LINEA / SPARKLINE ──
export function lineSVG(points, opts={}) {
  const W=opts.width||520, H=opts.height||160, padL=36, padR=12, padT=16, padB=28;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  if(!points.length) return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="11" fill="#5A6A5A">Sin datos</text></svg>`;
  const max=Math.max(...points.map(p=>Number(p.value)||0),1)*1.2;
  const min=0;
  const stepX=points.length>1?plotW/(points.length-1):plotW;
  const xFor=(i)=>padL+i*stepX;
  const yFor=(v)=>padT+plotH - ((Number(v)-min)/(max-min))*plotH;
  let path='', area='', dots='';
  points.forEach((p,i)=>{
    const x=xFor(i), y=yFor(p.value);
    path+= (i===0?'M':'L')+` ${x} ${y} `;
    if(i===0) area+=`M ${x} ${padT+plotH} L ${x} ${y} `;
    else area+=`L ${x} ${y} `;
    if(i===points.length-1) area+=`L ${x} ${padT+plotH} Z`;
    dots+=`<circle cx="${x}" cy="${y}" r="4" fill="#168A43" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y-10}" text-anchor="middle" font-size="9" font-weight="700" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${p.value}</text>`;
  });
  let grid='';
  for(let g=0;g<=3;g++){
    const y=padT+plotH - (plotH/3)*g;
    const v=Math.round(max/3*g);
    grid+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#E8EAE8" stroke-dasharray="4 4"/><text x="${padL-8}" y="${y+3}" text-anchor="end" font-size="8" fill="#5A6A5A">${v}</text>`;
  }
  let labels='';
  points.forEach((p,i)=>{
    labels+=`<text x="${xFor(i)}" y="${H-8}" text-anchor="middle" font-size="8" fill="#5A6A5A" font-family="Segoe UI,Arial,sans-serif">${esc(p.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${H}" rx="10" fill="#fff" stroke="#E8EAE8"/>
    ${grid}
    <path d="${area}" fill="#E8F5EE" opacity="0.7"/>
    <path d="${path}" fill="none" stroke="#168A43" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${labels}
  </svg>`;
}

// ── GAUGE / SEMAFORO ──
export function gaugeSVG(value, max, opts={}) {
  const W=opts.width||200, H=100;
  const pct=Math.max(0,Math.min(1,(Number(value)||0)/(max||100)));
  const angle = 180*pct;
  const cx=W/2, cy=H-6, r=72, thickness=14;
  // bg arc
  const bg=`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`;
  const col = pct>=0.8?'#168A43':pct>=0.5?'#E8BB26':'#C0392B';
  // value arc
  const rad=(180-angle)*Math.PI/180;
  // actually from 180 deg left to angle
  const a0=180*Math.PI/180, a1=(180-angle)*Math.PI/180;
  // simpler: use stroke-dasharray
  const circ = Math.PI*r;
  const dash = circ*pct;
  return `<svg viewBox="0 0 ${W} ${H+24}" width="${W}" height="${H+24}" xmlns="http://www.w3.org/2000/svg">
    <path d="${bg}" fill="none" stroke="#E8EAE8" stroke-width="${thickness}" stroke-linecap="round"/>
    <path d="${bg}" fill="none" stroke="${col}" stroke-width="${thickness}" stroke-linecap="round" stroke-dasharray="${dash} ${circ}" />
    <text x="${cx}" y="${cy-14}" text-anchor="middle" font-size="22" font-weight="800" fill="#12212D" font-family="Segoe UI,Arial,sans-serif">${value}${opts.suffix||''}</text>
    <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="9" font-weight="700" fill="#5A6A5A" font-family="Segoe UI,Arial,sans-serif">${esc(opts.label||pct*100+'%')}</text>
  </svg>`;
}

// ── KPI CARD helper (HTML, no SVG) ──
export function kpiCardsHTML(items){
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+items.map(it=>{
    const bc = it.sem==='ok'?'#E8F5EE':it.sem==='warn'?'#FDF6D8':it.sem==='bad'?'#FDF0EE':'#F2F4F2';
    const dot = it.sem==='ok'?'#168A43':it.sem==='warn'?'#E8BB26':it.sem==='bad'?'#C0392B':'#DDE4DD';
    return `<div style="background:${bc};border:1px solid #E8EAE8;border-radius:10px;padding:12px;text-align:center"><div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5A6A5A">${esc(it.label)}</div><div style="font-size:22px;font-weight:800;color:#12212D;margin-top:4px">${esc(String(it.value))}</div>${it.sub?`<div style="font-size:11px;color:#5A6A5A;margin-top:2px">${esc(it.sub)}</div>`:''}<div style="margin-top:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dot}"></span> <span style="font-size:10px;color:#5A6A5A">${esc(it.state||'')}</span></div></div>`;
  }).join('')+'</div>';
}
