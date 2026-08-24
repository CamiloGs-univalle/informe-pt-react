export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="mover on" onClick={onClose}>
      <div
        className="mdl"
        style={wide ? { maxWidth: "700px" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="mclose" onClick={onClose}>✕</button>
        {title && <h3 className="ct">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
