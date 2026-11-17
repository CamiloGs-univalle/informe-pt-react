/**
 * services/reportStyles.js
 * ─────────────────────────────────────────────────────────────────────────
 * Hoja de estilos y script del reporte HTML. Se separan de `htmlReport.service`
 * para que ese archivo hable solo del contenido.
 *
 * Reglas:
 *  - TODO el CSS cuelga de `.rpt` (la raíz del reporte). Así, cuando el reporte se
 *    mete con innerHTML para generar el PDF, no pisa los estilos de la aplicación.
 *  - Nada por debajo de 11 px. Los colores nunca van solos: siempre hay texto o símbolo.
 *  - Tres modos: pantalla (pestañas), impresión (`@media print`, todo seguido) y
 *    PDF (`.rpt-pdf`, lo mismo que impresión pero con ancho fijo).
 *  - Sin dependencias ni internet: el archivo se abre igual desde un correo.
 */

export const REPORT_CSS = String.raw`
.rpt{--vd:#168A43;--vdo:#0F6B33;--vc:#E8F5EE;--am:#E8BB26;--amc:#FDF6D8;--osc:#12212D;--ro:#C0392B;--roc:#FDF0EE;--az:#2196F3;
--tx:#12212D;--mut:#4A5A50;--bor:#DCE5DF;--fon:#F1F5F2;--card:#FFFFFF;
font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:var(--tx);background:var(--fon);font-size:14px;line-height:1.55;min-height:100%}
.rpt *{box-sizing:border-box}
.rpt h1,.rpt h2,.rpt h3,.rpt h4,.rpt p,.rpt ul,.rpt ol,.rpt figure,.rpt dl,.rpt dd{margin:0;padding:0}
.rpt ul,.rpt ol{list-style:none}
.rpt button{font:inherit;color:inherit}
.rpt [tabindex]:focus-visible,.rpt button:focus-visible,.rpt summary:focus-visible,.rpt a:focus-visible{outline:3px solid var(--az);outline-offset:2px;border-radius:6px}
.rpt .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* ── Encabezado ── */
.rpt .hero{background:linear-gradient(135deg,#168A43 0%,#0F6B33 55%,#12212D 100%);color:#fff;position:relative;overflow:hidden}
.rpt .hero::before{content:"";position:absolute;top:0;left:0;width:96px;height:96px;background:var(--am);clip-path:polygon(0 0,100% 0,0 100%)}
.rpt .hero::after{content:"";position:absolute;right:-40px;bottom:-60px;width:260px;height:260px;border-radius:50%;background:rgba(255,255,255,.07)}
.rpt .hero-in{max-width:1100px;margin:0 auto;padding:22px 24px 26px;position:relative;z-index:1}
.rpt .hero-top{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between}
.rpt .hero-logos{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.rpt .hero-logo{height:42px;width:auto}
.rpt .hero-sep{width:1px;height:38px;background:rgba(255,255,255,.3)}
.rpt .cli-logo{background:#fff;border-radius:10px;padding:5px 10px;display:flex;align-items:center}
.rpt .cli-logo img{height:38px;width:auto;max-width:150px;object-fit:contain}
.rpt .cli-nom{font-weight:700;font-size:15px}
.rpt .btn-print{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.45);color:#fff;border-radius:99px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}
.rpt .btn-print:hover{background:rgba(255,255,255,.26)}
.rpt .hero-tit{margin-top:20px}
.rpt .hero-kicker{font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--am)}
.rpt .hero-tit h1{font-size:30px;line-height:1.15;font-weight:800;margin-top:4px}
.rpt .hero-tit p{margin-top:6px;font-size:14px;opacity:.9}
.rpt .hero-tit .ej{opacity:.8;font-size:13px}

.rpt-compacto .hero-in{padding:12px 18px 14px}
.rpt-compacto .hero-tit{margin-top:10px}
.rpt-compacto .hero-tit h1{font-size:20px}
.rpt-compacto .hero-tit p,.rpt-compacto .hero-kicker,.rpt-compacto .btn-print{display:none}

/* ── Navegación ── */
.rpt .nav{background:var(--osc);border-bottom:3px solid var(--am);position:sticky;top:0;z-index:20}
.rpt .nav-in{max-width:1100px;margin:0 auto;display:flex;overflow-x:auto;padding:0 12px;scrollbar-width:thin}
.rpt .nb{background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-3px;color:rgba(255,255,255,.72);padding:12px 14px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;cursor:pointer}
.rpt .nb:hover{color:#fff;background:rgba(255,255,255,.07)}
.rpt .nb[aria-selected="true"]{color:var(--am);border-bottom-color:var(--am);background:rgba(232,187,38,.1)}
.rpt .nb .ic{margin-right:5px}

/* ── Páginas ── */
.rpt .main{max-width:1100px;margin:0 auto;padding:20px 20px 36px}
.rpt .tab{display:none}
.rpt .tab.on{display:block}
.rpt .tab>*+*{margin-top:16px}

.rpt .card{background:var(--card);border:1px solid var(--bor);border-radius:14px;padding:18px 20px;box-shadow:0 1px 3px rgba(18,33,45,.05)}
.rpt .card>h3{font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--vd);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.rpt .card>h3::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--am);flex:none}
.rpt .card .sub{font-size:13px;color:var(--mut);margin:-6px 0 12px}
.rpt .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.rpt .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.rpt .centro{display:flex;flex-direction:column;align-items:center;gap:10px}
.rpt .fila{display:flex;gap:18px;align-items:center;justify-content:center;flex-wrap:wrap}
.rpt .nota{font-size:13px;color:var(--mut)}
.rpt .sub-mod{margin-top:22px;padding-top:18px;border-top:2px dashed var(--bor)}
.rpt .sub-mod:first-of-type{margin-top:14px;padding-top:0;border-top:0}
.rpt .sub-t{font-size:18px;font-weight:800;color:var(--osc);margin-bottom:10px}
.rpt .vacio{font-size:13px;color:var(--mut);padding:10px 12px;background:var(--fon);border:1px dashed var(--bor);border-radius:10px}

/* ── Banner de cada módulo ── */
.rpt .mod-hd{background:linear-gradient(135deg,#168A43 0%,#0F6B33 100%);color:#fff;border-radius:14px;padding:20px 24px;position:relative;overflow:hidden}
.rpt .mod-hd::before{content:"";position:absolute;top:0;left:0;width:60px;height:60px;background:var(--am);clip-path:polygon(0 0,100% 0,0 100%)}
.rpt .mod-hd .k{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;font-weight:700;padding-left:22px}
.rpt .mod-hd h2{font-size:22px;font-weight:800;margin-top:2px;padding-left:22px}
.rpt .mod-hd .q{margin-top:8px;font-size:15px;font-style:italic;opacity:.95;padding-left:22px}
.rpt .lectura{display:flex;gap:12px;align-items:flex-start;border-radius:12px;padding:14px 16px;border-left:5px solid var(--vd);background:var(--vc);color:#14391f;font-size:14px}
.rpt .lectura.warn{background:var(--amc);border-left-color:var(--am);color:#5a4500}
.rpt .lectura.bad{background:var(--roc);border-left-color:var(--ro);color:#6f1a1a}
.rpt .lectura.info{background:#E7F1FB;border-left-color:var(--az);color:#143f63}
.rpt .lectura .li{font-size:20px;line-height:1.2;flex:none}
.rpt .lectura strong{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px}

/* ── Chips de estado ── */
.rpt .chip{display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 10px;font-size:12px;font-weight:700;white-space:nowrap}
.rpt .chip.ok{background:#DDF1E4;color:#0F5A2B}
.rpt .chip.warn{background:#FFF1C2;color:#6B5200}
.rpt .chip.bad{background:#FBE0DC;color:#8B1A1A}
.rpt .chip.info{background:#DCEBF9;color:#174A73}
.rpt .chip.gris{background:#E8EEEA;color:#44524A}

/* ── Resumen ── */
.rpt .titular{background:var(--card);border:1px solid var(--bor);border-radius:16px;padding:22px 24px;display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;border-left:6px solid var(--vd)}
.rpt .titular.warn{border-left-color:var(--am)}
.rpt .titular.bad{border-left-color:var(--ro)}
.rpt .titular.info{border-left-color:var(--az)}
.rpt .titular .kk{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.rpt .titular h2{font-size:24px;line-height:1.2;font-weight:800;margin-top:4px}
.rpt .titular p{margin-top:6px;color:var(--mut);font-size:14px}
.rpt .semaforos{display:flex;gap:10px;flex-wrap:wrap}
.rpt .sem{min-width:96px;text-align:center;border-radius:12px;padding:10px 12px}
.rpt .sem b{display:block;font-size:30px;line-height:1;font-weight:800}
.rpt .sem span{font-size:12px;font-weight:700}
.rpt .sem.ok{background:#DDF1E4;color:#0F5A2B}
.rpt .sem.warn{background:#FFF1C2;color:#6B5200}
.rpt .sem.bad{background:#FBE0DC;color:#8B1A1A}
.rpt .sem.cero{opacity:.45}

.rpt .kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(235px,1fr));gap:14px}
.rpt .kpi{background:var(--card);border:1px solid var(--bor);border-top:5px solid var(--bor);border-radius:14px;padding:14px 16px 12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(18,33,45,.05)}
.rpt .kpi.ok{border-top-color:var(--vd)}
.rpt .kpi.warn{border-top-color:var(--am)}
.rpt .kpi.bad{border-top-color:var(--ro)}
.rpt .kpi.info{border-top-color:var(--az)}
.rpt .kpi-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rpt .kpi-nom{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--mut);display:flex;gap:6px;align-items:center}
.rpt .kpi-val{font-size:32px;line-height:1.05;font-weight:800;color:var(--tx)}
.rpt .kpi-val small{font-size:14px;font-weight:700;color:var(--mut);margin-left:4px}
.rpt .kpi-meta{font-size:12px;color:var(--mut);font-weight:600}
.rpt .kpi-sub{font-size:13px;color:var(--tx)}
.rpt .delta{font-size:12px;font-weight:700;display:flex;gap:5px;align-items:center}
.rpt .delta.ok{color:#0F5A2B}
.rpt .delta.bad{color:#8B1A1A}
.rpt .delta.neutral{color:var(--mut)}
.rpt .kpi-ex{display:none;font-size:13px;color:#2c3b33;background:var(--vc);border-radius:10px;padding:9px 11px}
.rpt .kpi.open .kpi-ex{display:block}
.rpt .kpi-ac{display:flex;gap:8px;margin-top:auto;padding-top:4px;flex-wrap:wrap}
.rpt .lnk{background:none;border:1px solid var(--bor);border-radius:99px;padding:5px 11px;font-size:12px;font-weight:700;color:var(--vdo);cursor:pointer}
.rpt .lnk:hover{background:var(--vc);border-color:var(--vd)}
.rpt .kpi .info-btn{margin-left:auto}

.rpt .trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.rpt .col{background:var(--card);border:1px solid var(--bor);border-radius:14px;padding:16px 18px;border-top:5px solid var(--vd)}
.rpt .col.vig{border-top-color:var(--am)}
.rpt .col.sig{border-top-color:var(--az)}
.rpt .col h3{font-size:15px;font-weight:800;display:flex;gap:8px;align-items:center;margin-bottom:8px}
.rpt .col li{position:relative;padding-left:20px;font-size:14px;margin-top:8px}
.rpt .col li::before{content:"✔";position:absolute;left:0;color:var(--vd);font-weight:800}
.rpt .col.vig li::before{content:"!";color:#9A7A10;font-weight:800;left:3px}
.rpt .col.sig li::before{content:"→";color:var(--az)}
.rpt .col .vacio{margin-top:6px}

.rpt .leer{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.rpt .leer .paso{background:var(--fon);border-radius:12px;padding:12px 14px;font-size:13px}
.rpt .leer .paso b{display:flex;gap:8px;align-items:center;margin-bottom:4px;font-size:14px}
.rpt .leer .num{display:inline-flex;width:24px;height:24px;border-radius:50%;background:var(--vd);color:#fff;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex:none}
.rpt .claves{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}

/* ── Explicación didáctica ── */
.rpt details.expl{background:var(--card);border:1px solid var(--bor);border-radius:14px;overflow:hidden}
.rpt details.expl>summary{cursor:pointer;list-style:none;padding:13px 18px;font-weight:800;font-size:14px;color:var(--vdo);display:flex;align-items:center;gap:10px}
.rpt details.expl>summary::-webkit-details-marker{display:none}
.rpt details.expl>summary::after{content:"＋";margin-left:auto;font-size:18px;color:var(--vd)}
.rpt details.expl[open]>summary::after{content:"－"}
.rpt details.expl[open]>summary{border-bottom:1px solid var(--bor);background:var(--vc)}
.rpt .expl-b{padding:14px 18px 16px;display:grid;gap:12px}
.rpt .expl-b dt{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.rpt .expl-b dd{font-size:14px;margin-top:2px}
.rpt .formula{font-family:Consolas,"Courier New",monospace;background:var(--fon);border:1px solid var(--bor);border-radius:8px;padding:8px 12px;font-size:13px}

/* ── Tablas ── */
.rpt .tw{overflow-x:auto}
.rpt table{width:100%;border-collapse:collapse;font-size:13px}
.rpt th{background:var(--vd);color:#fff;padding:9px 10px;font-size:12px;font-weight:700;letter-spacing:.03em;text-align:left}
.rpt th:first-child{border-radius:8px 0 0 0}
.rpt th:last-child{border-radius:0 8px 0 0}
.rpt td{padding:8px 10px;border-bottom:1px solid #E6EDE8;vertical-align:middle}
.rpt tbody tr:hover td{background:#F5FAF7}
.rpt .c{text-align:center}
.rpt td:first-child{white-space:nowrap}
.rpt .kpi-val.largo{font-size:24px}
.rpt tr.tot td{background:var(--vc);font-weight:800;color:var(--vdo)}
.rpt .tg{background:none;border:1px solid var(--bor);border-radius:8px;width:28px;height:28px;cursor:pointer;font-weight:800;color:var(--vdo)}
.rpt tr.seg-row{display:none}
.rpt tr.seg-row.on{display:table-row}
.rpt tr.seg-row td{background:var(--vc);font-size:13px}

/* ── Gráficas ── */
.rpt .cht{width:100%;height:auto;max-width:520px;display:block;margin:0 auto}
.rpt .cht.donut{max-width:190px}
.rpt .cht.gauge{max-width:320px}
.rpt [data-tip]{cursor:default}
.rpt .seg{transition:opacity .15s,transform .15s;transform-box:fill-box;transform-origin:center}
.rpt .seg:hover,.rpt .seg:focus{opacity:.82;outline:none;stroke:#fff;stroke-width:2}
.rpt .vb{transform-box:fill-box;transform-origin:bottom;animation:rpt-rise .7s cubic-bezier(.2,.8,.2,1) both}
.rpt .vb:hover,.rpt .vb:focus{opacity:.85;outline:none}
@keyframes rpt-rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.rpt .leyenda{display:grid;gap:6px;min-width:180px;flex:1}
.rpt .leyenda li{display:grid;grid-template-columns:14px 1fr auto auto;gap:8px;align-items:center;font-size:13px}
.rpt .leyenda .sw{width:12px;height:12px;border-radius:4px}
.rpt .leyenda .lp{color:var(--mut);min-width:42px;text-align:right}
.rpt .barras{display:grid;gap:4px;padding-top:16px}
.rpt .barra{display:grid;grid-template-columns:minmax(110px,32%) 1fr auto;gap:10px;align-items:center;padding:4px 0;border-radius:8px}
.rpt .barra:hover,.rpt .barra:focus{background:#F5FAF7;outline:none}
.rpt .b-lab{font-size:13px;font-weight:600;overflow-wrap:anywhere}
.rpt .b-pista{position:relative;height:16px;background:#E6EDE8;border-radius:99px}
.rpt .b-rel{height:100%;border-radius:99px;min-width:3px;transition:width .5s}
.rpt .b-meta{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--osc)}
.rpt .b-meta span{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:11px;font-weight:800;color:var(--osc);white-space:nowrap}
.rpt .barra:not(:first-child) .b-meta span{display:none}
.rpt .b-val{font-size:13px;font-weight:800;min-width:42px;text-align:right}

.rpt .metas{display:grid;gap:6px}
.rpt .meta-fila{display:grid;grid-template-columns:minmax(120px,28%) 1fr auto;gap:12px;align-items:center;background:none;border:0;border-radius:10px;padding:8px 6px;width:100%;text-align:left;cursor:pointer}
.rpt .meta-fila:hover,.rpt .meta-fila:focus{background:#F5FAF7}
.rpt .m-nom{font-size:13px;font-weight:700}
.rpt .m-pista{position:relative;height:12px;border-radius:99px;overflow:visible;background:#E6EDE8;display:block}
.rpt .zona{position:absolute;top:0;bottom:0;opacity:.9}
.rpt .zona:first-child{border-radius:99px 0 0 99px}
.rpt .zona:last-of-type{border-radius:0 99px 99px 0}
.rpt .punto{position:absolute;top:50%;width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid var(--osc);transform:translate(-50%,-50%);box-shadow:0 1px 4px rgba(0,0,0,.3)}
.rpt .m-val{font-size:14px;font-weight:800;min-width:64px;text-align:right}
.rpt .metas-ley{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin-top:10px}
.rpt .metas-ley i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:5px;vertical-align:-2px}

.rpt .cmp{display:grid;gap:10px}
.rpt .cmp-fila{display:grid;grid-template-columns:minmax(120px,26%) 1fr auto;gap:12px;align-items:center;font-size:13px;border-radius:8px;padding:2px 4px}
.rpt .cmp-fila:hover,.rpt .cmp-fila:focus{background:#F5FAF7;outline:none}
.rpt .c-nom{font-weight:700}
.rpt .c-barras{display:grid;gap:3px}
.rpt .c-b{display:block;height:9px;border-radius:99px;min-width:3px}
.rpt .c-b.antes{background:#B8C4BC}
.rpt .c-b.ahora{background:var(--vd)}
.rpt .c-val{text-align:right;white-space:nowrap}
.rpt .cmp-ley{display:flex;gap:16px;font-size:12px;color:var(--mut);margin-top:10px}
.rpt .cmp-ley i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:5px;vertical-align:-2px}

/* ── Fotos ── */
.rpt .fotos{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.rpt .foto{border-radius:12px;overflow:hidden;border:1px solid var(--bor);background:#fff;cursor:zoom-in}
.rpt .foto img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.rpt .foto figcaption{padding:8px 12px;font-size:13px;font-weight:600}
.rpt .zoom{position:fixed;inset:0;background:rgba(10,20,28,.88);z-index:60;display:none;align-items:center;justify-content:center;padding:20px;cursor:zoom-out}
.rpt .zoom.on{display:flex}
.rpt .zoom img{max-width:100%;max-height:100%;border-radius:10px}

/* ── Pie ── */
.rpt .pie{background:var(--osc);color:#fff;border-top:4px solid var(--am)}
.rpt .pie-in{max-width:1100px;margin:0 auto;padding:18px 24px;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.rpt .pie img{height:34px;width:auto}
.rpt .pie p{font-size:12px;opacity:.85}
.rpt .gloss{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 22px}
.rpt .gloss dt{font-weight:800;font-size:13px}
.rpt .gloss dd{font-size:13px;color:var(--mut)}

/* ── Tooltip ── */
.rpt-tip{position:fixed;z-index:80;max-width:270px;background:#12212D;color:#fff;font:600 12px/1.4 "Segoe UI",system-ui,Arial,sans-serif;padding:7px 10px;border-radius:8px;pointer-events:none;opacity:0;transition:opacity .12s;box-shadow:0 4px 14px rgba(0,0,0,.3)}
.rpt-tip.on{opacity:1}

/* ── Celular ── */
@media (max-width:760px){
.rpt .hero-in{padding:18px 16px 22px}
.rpt .hero-tit h1{font-size:23px}
.rpt .main{padding:14px 12px 28px}
.rpt .grid2,.rpt .grid3,.rpt .trio,.rpt .leer,.rpt .gloss{grid-template-columns:1fr}
.rpt .titular{grid-template-columns:1fr}
.rpt .titular h2{font-size:20px}
.rpt .kpis{grid-template-columns:1fr 1fr}
.rpt .kpi-val{font-size:26px}
.rpt .barra,.rpt .meta-fila,.rpt .cmp-fila{grid-template-columns:1fr auto}
.rpt .barra .b-pista,.rpt .meta-fila .m-pista,.rpt .cmp-fila .c-barras{grid-column:1/-1;order:3}
.rpt .meta-fila .m-nom,.rpt .barra .b-lab,.rpt .cmp-fila .c-nom{grid-column:1}
}
@media (max-width:430px){.rpt .kpis{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.rpt .vb{animation:none}.rpt .b-rel{transition:none}}

/* ── Impresión y PDF: todas las secciones seguidas, sin controles ── */
@page{size:A4 portrait;margin:10mm}
@media print{
.rpt{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rpt .nav,.rpt .btn-print,.rpt .no-print,.rpt .info-btn,.rpt .lnk,.rpt .rpt-tip,.rpt .zoom{display:none!important}
.rpt .tab{display:block!important}
.rpt .tab+.tab{break-before:page;page-break-before:always}
.rpt .tab>*+*{margin-top:12px}
.rpt .card,.rpt .kpi,.rpt .col,.rpt .titular,.rpt .lectura,.rpt details.expl,.rpt tr,.rpt .foto{break-inside:avoid;page-break-inside:avoid}
.rpt .kpi-ex{display:block}
.rpt .vb{animation:none}
.rpt .main{max-width:none;padding:12px 0}
.rpt .hero-in,.rpt .pie-in{max-width:none}
}
.rpt.rpt-pdf{width:100%;background:#fff}
.rpt-pdf .main{max-width:none;padding:12px 0 0}
.rpt-pdf .hero-in,.rpt-pdf .pie-in{max-width:none}
.rpt-pdf .hero-tit h1{font-size:26px}
.rpt-pdf .trio{grid-template-columns:1fr}
.rpt-pdf .grid2{grid-template-columns:1fr}
.rpt-pdf .leer{grid-template-columns:1fr}
.rpt-pdf .gloss{grid-template-columns:1fr}
.rpt-pdf .nav,.rpt-pdf .btn-print,.rpt-pdf .no-print,.rpt-pdf .info-btn,.rpt-pdf .lnk,.rpt-pdf .zoom{display:none!important}
.rpt-pdf .tab{display:block!important}
.rpt-pdf .tab+.tab{page-break-before:always}
.rpt-pdf .kpi-ex{display:block}
.rpt-pdf .vb{animation:none}
.rpt-pdf .kpis{grid-template-columns:repeat(3,1fr)}
.rpt-pdf .tab+.tab{break-before:page}
.rpt-pdf .tw{overflow:visible}
.rpt-pdf table{font-size:12px}
.rpt-pdf th{font-size:11px;letter-spacing:0}
.rpt-pdf td,.rpt-pdf th{padding:6px 5px}
.rpt-pdf td:first-child{white-space:nowrap}
.rpt-pdf .chip{white-space:normal}
`;

/** Script del reporte (sin dependencias, ES5 para que funcione en cualquier visor). */
export const REPORT_JS = String.raw`
(function(){
  var raiz=document.querySelector('.rpt'); if(!raiz) return;
  var tabs=[].slice.call(raiz.querySelectorAll('.tab'));
  var botones=[].slice.call(raiz.querySelectorAll('.nb'));
  function ir(id,enfocar){
    var panel=raiz.querySelector('#t-'+id); if(!panel) return;
    tabs.forEach(function(t){t.classList.toggle('on',t===panel)});
    botones.forEach(function(b){var on=b.getAttribute('data-tab')===id;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;if(on&&enfocar){b.scrollIntoView({block:'nearest',inline:'center'})}});
    var nav=raiz.querySelector('.nav'); var top=nav?nav.getBoundingClientRect().top+window.pageYOffset:0;
    if(window.pageYOffset>top){window.scrollTo({top:top,behavior:'smooth'})}
  }
  raiz.addEventListener('click',function(e){
    var b=e.target.closest('.nb'); if(b){ir(b.getAttribute('data-tab'),true);return}
    var g=e.target.closest('[data-go]'); if(g){ir(g.getAttribute('data-go'),true);return}
    var i=e.target.closest('.info-btn'); if(i){var k=i.closest('.kpi');var o=k.classList.toggle('open');i.setAttribute('aria-expanded',o?'true':'false');return}
    var t=e.target.closest('.tg'); if(t){var r=raiz.querySelector('#'+t.getAttribute('data-row'));if(r){var on=r.classList.toggle('on');t.setAttribute('aria-expanded',on?'true':'false');t.textContent=on?'−':'+'}return}
    var p=e.target.closest('.btn-print'); if(p){window.print();return}
    var f=e.target.closest('.foto img'); if(f){var z=raiz.querySelector('.zoom');z.querySelector('img').src=f.src;z.classList.add('on');return}
    if(e.target.closest('.zoom')){raiz.querySelector('.zoom').classList.remove('on')}
  });
  botones.forEach(function(b,idx){
    b.addEventListener('keydown',function(e){
      var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0; if(!d) return;
      var n=botones[(idx+d+botones.length)%botones.length]; n.focus(); ir(n.getAttribute('data-tab'),true); e.preventDefault();
    });
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var z=raiz.querySelector('.zoom');if(z)z.classList.remove('on')}});
  /* Tooltip: mouse, teclado y toque */
  var tip=document.createElement('div'); tip.className='rpt-tip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip);
  function mostrar(el,x,y){
    tip.textContent=el.getAttribute('data-tip'); tip.classList.add('on');
    var w=tip.offsetWidth,h=tip.offsetHeight,vw=window.innerWidth;
    var l=Math.min(Math.max(8,x-w/2),vw-w-8), t=y-h-14; if(t<8) t=y+18;
    tip.style.left=l+'px'; tip.style.top=t+'px';
  }
  function ocultar(){tip.classList.remove('on')}
  raiz.addEventListener('mousemove',function(e){var el=e.target.closest('[data-tip]'); if(el) mostrar(el,e.clientX,e.clientY); else ocultar()});
  raiz.addEventListener('mouseleave',ocultar);
  raiz.addEventListener('focusin',function(e){var el=e.target.closest('[data-tip]'); if(el){var r=el.getBoundingClientRect(); mostrar(el,r.left+r.width/2,r.top)}});
  raiz.addEventListener('focusout',ocultar);
  raiz.addEventListener('touchstart',function(e){var el=e.target.closest('[data-tip]'); if(el){var t=e.touches[0]; mostrar(el,t.clientX,t.clientY)} else ocultar()},{passive:true});
  window.addEventListener('scroll',ocultar,{passive:true});
  /* Al imprimir se abre todo lo plegado */
  window.addEventListener('beforeprint',function(){[].forEach.call(raiz.querySelectorAll('details'),function(d){d.setAttribute('data-estaba',d.open?'1':'0');d.open=true});[].forEach.call(raiz.querySelectorAll('tr.seg-row'),function(r){r.classList.add('on')})});
  window.addEventListener('afterprint',function(){[].forEach.call(raiz.querySelectorAll('details'),function(d){d.open=d.getAttribute('data-estaba')==='1'})});
  /* Enlace directo a una sección: informe.html#rot */
  var h=(location.hash||'').replace('#',''); if(h&&raiz.querySelector('#t-'+h)) ir(h);
})();
`;
