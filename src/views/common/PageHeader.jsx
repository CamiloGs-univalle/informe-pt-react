/** Encabezado estándar de página: título, subtítulo y acciones a la derecha. */
export default function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="page-head">
      <div className="page-head-main">
        <h1 className="page-title">{title}{badge && <span className="page-badge">{badge}</span>}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
