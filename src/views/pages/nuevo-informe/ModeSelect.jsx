/** Primera pantalla del asistente: ¿subir archivos Excel o llenar campo por campo? */
export default function ModeSelect({ onSelect }) {
  return (
    <div className="grid-2">
      <button type="button" className="mode-card" onClick={() => onSelect('auto')}>
        <span className="mode-ico" aria-hidden="true">📊</span>
        <span className="mode-t">Con archivos Excel</span>
        <span className="mode-s">Sube los Excel (o tráelos de Google Drive) y el sistema extrae los datos. Después revisas y ajustas lo que haga falta.</span>
        <span className="mode-go">Empezar con archivos →</span>
      </button>
      <button type="button" className="mode-card" onClick={() => onSelect('manual')}>
        <span className="mode-ico" aria-hidden="true">✏️</span>
        <span className="mode-t">Llenar a mano</span>
        <span className="mode-s">Completa cada sección del informe paso a paso. Ideal si no tienes archivos o ya hay aportes de las áreas que quieres revisar.</span>
        <span className="mode-go">Empezar a llenar →</span>
      </button>
    </div>
  );
}
