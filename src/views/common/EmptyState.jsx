/** Estado vacío con propósito: dice qué pasa y qué hacer a continuación (botón opcional). */
export default function EmptyState({ icon = '📭', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-ico" aria-hidden="true">{icon}</div>
      <div className="empty-t">{title}</div>
      {children && <div className="empty-s">{children}</div>}
      {action && <div className="empty-a">{action}</div>}
    </div>
  );
}
