/**
 * views/pages/tablero/RejectModal.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Pide un motivo antes de rechazar una contribución. Antes "Rechazar" no
 * pedía ninguna razón, así que el área afectada no tenía forma de saber qué
 * corregir — esto cierra ese hueco.
 */
import { useState, useEffect } from 'react';
import Modal from '../../common/Modal';

export default function RejectModal({ target, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [target]);

  return (
    <Modal open={!!target} onClose={onCancel} title={target ? `Rechazar · ${target.areaNombre} — ${target.cliNom}` : 'Rechazar'}>
      <div style={{ fontSize: 12, color: 'var(--grt)', marginBottom: 10 }}>
        Cuéntale al área qué le falta o qué corregir. Este motivo queda visible para que puedan volver a subir su parte.
      </div>
      <label className="flabel">Motivo del rechazo</label>
      <textarea className="finput" rows={3} value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Ej. Faltan las vacantes activas de la sede Cali, por favor complementa..." />
      <div className="brow">
        <button className="btn bro" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>↩️ Rechazar y notificar</button>
        <button className="btn bgh" onClick={onCancel}>Cancelar</button>
      </div>
    </Modal>
  );
}
