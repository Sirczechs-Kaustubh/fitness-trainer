// apps/web/components/dashboard/StatCard.jsx
export default function StatCard({ label, value, delta, icon, hint, className = "" }) {
  const deltaColor =
    typeof delta === "number"
      ? delta > 0
        ? "text-emerald-400"
        : delta < 0
        ? "text-red-400"
        : "text-brand-muted"
      : "text-brand-muted";

  return (
    <div className={`card-glass p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-brand-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        {icon ? <div className="rounded-2xl border border-white/10 p-3 bg-white/5">{icon}</div> : null}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className={`text-xs ${deltaColor}`}>
          {typeof delta === "number" ? (delta > 0 ? `▲ ${delta}%` : delta < 0 ? `▼ ${Math.abs(delta)}%` : "— 0%") : delta}
        </p>
        {hint && <p className="text-xs text-brand-muted">{hint}</p>}
      </div>
    </div>
  );
}
