export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="mover on" onClick={(e) => { if (e.target.className === "mover") onClose(); }}>
      <div className={"mdl" + (wide ? " lg" : "")} style={wide ? {maxWidth:680} : {}}>
        <button className="mclose" onClick={onClose}>✕</button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}
