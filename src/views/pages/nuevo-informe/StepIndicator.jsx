/** Barra de pasos del asistente: puedes volver a cualquier paso anterior con un clic. */
export default function StepIndicator({ steps, step, onStepClick }) {
  return (
    <ol className="stepper" aria-label="Pasos del informe">
      {steps.map((s, i) => {
        const estado = i === step ? 'on' : i < step ? 'done' : '';
        return (
          <li key={s.id} className={'stepper-i ' + estado}>
            <button type="button" onClick={() => i <= step && onStepClick(i)} disabled={i > step} aria-current={i === step ? 'step' : undefined}>
              <span className="stepper-ico" aria-hidden="true">{i < step ? '✓' : s.icon}</span>
              <span className="stepper-l">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
