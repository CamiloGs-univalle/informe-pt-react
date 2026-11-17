/**
 * Vista previa en vivo de «tu parte» tal como se verá en el informe del cliente.
 * Usa el mismo generador del informe final, solo con los módulos de la persona; se actualiza sola
 * (con una pausa corta para no recalcular en cada tecla). Las secciones de otras áreas aparecen cuando
 * el ejecutivo arma el informe completo.
 */
import { useEffect, useMemo, useState } from 'react';
import { getEj } from '../../../models/Ejecutivo';
import { buildInformePreviewHtml } from '../../../controllers/informeController';

export default function VistaPreviaAporte({ cli, per, datos, modulos }) {
  const lider = getEj(cli.ejId);
  const state = useMemo(() => ({
    cliId: cli.id, periodo: per, ejecutivo: lider, logo: null,
    headcount: datos.headcount, sst: datos.sst, nomina: datos.nomina, obs: datos.obs, seleccion: datos.seleccion, rotacion: datos.rotacion,
    fotos: datos.fotos, ausentismo: datos.ausentismo, capacitacion: datos.capacitacion, clima: datos.clima, facturacion: datos.facturacion,
    activeModules: modulos, compacto: true,
  }), [cli.id, per, lider, datos, modulos]);

  const [html, setHtml] = useState(() => buildInformePreviewHtml(state));
  useEffect(() => {
    const t = setTimeout(() => setHtml(buildInformePreviewHtml(state)), 500);
    return () => clearTimeout(t);
  }, [state]);

  return <iframe title="Vista previa de tu parte del informe" className="ap-prev-frame" srcDoc={html} />;
}
