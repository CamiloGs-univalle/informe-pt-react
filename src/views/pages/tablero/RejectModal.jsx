/** Pide un motivo antes de devolver un aporte: el área lo ve en "Mis aportes". */
import { useState } from 'react';
import Modal from '../../common/Modal';

function Form({ target, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <>
      <p className="text-muted" style={{ marginBottom: 12 }}>
        Cuéntale al área qué falta o qué debe corregir. El mensaje le aparece en su pantalla “Mis aportes” para que vuelva a enviar su parte.
      </p>
      <label className="flabel" htmlFor="rej-reason">Qué debe corregir</label>
      <textarea id="rej-reason" className="finput" rows={4} value={reason} autoFocus onChange={e => setReason(e.target.value)}
        placeholder="Ej. Faltan las vacantes activas de la sede Cali; por favor complétalas." />
      <div className="brow">
        <button type="button" className="btn bro" onClick={() => onConfirm(reason.trim())} disabled={reason.trim().length < 5}>Devolver al área</button>
        <button type="button" className="btn bgh" onClick={onCancel}>Cancelar</button>
      </div>
      {target && reason.trim().length > 0 && reason.trim().length < 5 && <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>Escribe al menos unas palabras para que el área entienda qué hacer.</div>}
    </>
  );
}

export default function RejectModal({ target, onCancel, onConfirm }) {
  return (
    <Modal open={!!target} onClose={onCancel} title={target ? `Pedir corrección · ${target.areaNombre}` : ''}>
      {target && <div className="chip" style={{ marginBottom: 12 }}>{target.cliNom}</div>}
      {target && <Form key={target.cliId + target.areaId} target={target} onCancel={onCancel} onConfirm={onConfirm} />}
    </Modal>
  );
}
