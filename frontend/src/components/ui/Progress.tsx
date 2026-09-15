export function Progress({
  value,
  indeterminate = false,
  label,
}: {
  value?: number;
  indeterminate?: boolean;
  label?: React.ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div className={`progress${indeterminate ? " indeterminate" : ""}`} role="progressbar" aria-valuenow={indeterminate ? undefined : pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar" style={indeterminate ? undefined : { width: `${pct}%` }} />
      </div>
      {label && <div className="text-xs text-muted">{label}</div>}
    </div>
  );
}