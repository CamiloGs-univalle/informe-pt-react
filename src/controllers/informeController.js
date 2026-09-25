/**
 * controllers/informeController.js
 * ─────────────────────────────────────────────────────────────────────────
 * Orchestrates building, naming and saving a monthly Informe from the
 * "Nuevo informe" wizard's form state. Extracted from `views/pages/NuevoInforme.jsx`
 * so that view stays focused on the multi-step UI, while all the
 * "assemble domain data + render report" logic lives here and can be
 * reused/tested independently.
 *
 * Behaviour mirrors exactly what was previously inlined in the view.
 */
import { getCli } from '../models/Cliente';
import { saveInf } from '../models/Informe';
import { buildInformeHTML } from '../services/htmlReport.service';
import { MESES_CORTOS } from '../utils/format';

/**
 * Assembles the full Informe HTML from the wizard's current form state.
 * @param {object} state - { cliId, periodo, ejecutivo, headcount, sst, nomina, obs, seleccion, rotacion, fotos, logo }
 * @returns {string} the rendered, self-contained HTML report.
 */
export function buildInformePreviewHtml(state) {
  const { cliId, periodo, ejecutivo, headcount, sst, nomina, obs, seleccion, rotacion, fotos, logo, ausentismo, capacitacion, clima, facturacion, activeModules } = state;
  const cli = getCli(cliId);
  const hcCierre = (headcount?.inicio || 0) + (headcount?.ingresos || 0) - (headcount?.retiros || 0);

  return buildInformeHTML(
    {
      cliId, per: periodo, ejNom: ejecutivo?.nom || '',
      cliNom: cli?.nom || '', cliMarca: cli?.marca || '',
      logoCli: cli?.logo || logo,
      hcInicio: headcount?.inicio || 0, hcIng: headcount?.ingresos || 0, hcRet: headcount?.retiros || 0, hcCierre,
      at: sst?.indicadores?.at || 0, oc: sst?.indicadores?.oc || 0,
      mat: sst?.indicadores?.maternidad || 0, eg: sst?.indicadores?.eg || 0,
      arl: sst?.indicadores?.arl || 0, ind: sst?.indicadores?.inducciones || 0,
      sstObs: obs, sstCasos: sst?.casos || [],
      nliq: nomina?.liquidados || 0, ninc: nomina?.incapacidades || 0,
      nlic: nomina?.licencias || 0, nhed: nomina?.heDiurnas || 0,
      nhen: nomina?.heNocturnas || 0, nerr: nomina?.errores || 0,
      nobs: nomina?.observaciones || '', rotObs: obs,
      ausentismo, capacitacion, clima, facturacion,
    },
    seleccion, rotacion, sst?.casos || [], fotos,
    { ausentismo, capacitacion, clima, facturacion, activeModules }
  );
}

/** Builds the `Informe_<cliente>_<Mes>_<Año>.<ext>` export filename. */
export function buildInformeFileName(cliId, periodo, ext) {
  const cli = getCli(cliId);
  const pts = periodo.split('-');
  return `Informe_${cli?.nom || 'Cliente'}_${MESES_CORTOS[+pts[1] - 1]}_${pts[0]}.${ext}`;
}

/** Persists the finished Informe (including its rendered HTML) to the model layer. */
export function saveInforme({ cliId, periodo, ejId, ejecutivo, previewHtml, headcount, seleccion, rotacion, sst, nomina, fotos, ausentismo, capacitacion, clima, facturacion, activeModules }) {
  const cli = getCli(cliId);
  return saveInf({
    cliId, per: periodo, ejId, ejNom: ejecutivo?.nom || '', cliNom: cli?.nom || '',
    html: previewHtml, headcount, seleccion, rotacion, sst, nomina, fotos,
    ausentismo, capacitacion, clima, facturacion, activeModules,
    rating: null, feedback: '',
  });
}
