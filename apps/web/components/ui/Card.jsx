export default function Card({ title, subtitle, className = "", children, footer }) {
  return (
    <div className={`card-glass p-5 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {subtitle && <p className="text-sm text-brand-muted">{subtitle}</p>}
        </div>
      )}
      {children}
      {footer && <div className="mt-4 pt-3 border-t border-white/10">{footer}</div>}
    </div>
  );
}
