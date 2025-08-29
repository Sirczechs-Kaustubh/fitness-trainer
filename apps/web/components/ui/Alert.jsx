export default function Alert({ kind="error", children }) {
  const styles = kind === "success"
    ? "bg-brand-primary/15 text-brand-primary border-brand-primary/40"
    : "bg-brand-danger/15 text-brand-danger border-brand-danger/40";
  return (
    <div className={`rounded-2xl border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
