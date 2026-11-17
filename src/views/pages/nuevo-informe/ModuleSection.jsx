/** Dibuja el formulario de UN módulo del informe (el mismo en el asistente y en "Mis aportes"). */
import StepHeadcount from './StepHeadcount';
import StepSeleccion from './StepSeleccion';
import StepRotacion from './StepRotacion';
import StepSST from './StepSST';
import StepNomina from './StepNomina';
import StepAusentismo from './StepAusentismo';
import StepCapacitacion from './StepCapacitacion';
import StepClima from './StepClima';
import StepFacturacion from './StepFacturacion';
import StepFotos from './StepFotos';

export default function ModuleSection({ id, data, onFotoError, modulos }) {
  const { d } = data;
  switch (id) {
    case 'headcount': return <StepHeadcount headcount={d.headcount} setHeadcount={data.setHeadcount} />;
    case 'seleccion': return <StepSeleccion seleccion={d.seleccion} addRQ={data.addRQ} removeRQ={data.removeRQ} updateRQ={data.updateRQ} />;
    case 'rotacion': return <StepRotacion rotacion={d.rotacion} addMotivo={data.addMotivo} removeMotivo={data.removeMotivo} updateMotivo={data.updateMotivo} />;
    case 'sst': return <StepSST sst={d.sst} setSst={data.setSst} obs={d.obs} setObs={data.setObs} addCaso={data.addCaso} removeCaso={data.removeCaso} updateCaso={data.updateCaso} modulos={modulos} addSede={data.addSede} removeSede={data.removeSede} updateSede={data.updateSede} />;
    case 'nomina': return <StepNomina nomina={d.nomina} setNomina={data.setNomina} />;
    case 'ausentismo': return <StepAusentismo ausentismo={d.ausentismo} setAusentismo={data.setAusentismo} />;
    case 'capacitacion': return <StepCapacitacion capacitacion={d.capacitacion} setCapacitacion={data.setCapacitacion} addItem={data.addCapTema} removeItem={data.removeCapTema} updateItem={data.updateCapTema} />;
    case 'clima': return <StepClima clima={d.clima} setClima={data.setClima} />;
    case 'facturacion': return <StepFacturacion facturacion={d.facturacion} setFacturacion={data.setFacturacion} />;
    case 'fotos': return <StepFotos fotos={d.fotos} onFoto={async (i, e) => { const err = await data.handleFoto(i, e); if (err) onFotoError?.(err); }} onRemoveFoto={data.removeFoto} />;
    default: return null;
  }
}
