import { cn } from "@/lib/util";

export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn("switch", disabled && "opacity-50")}
      style={{ opacity: disabled ? 0.5 : 1 }}
      onClick={() => onChange(!checked)}
    >
      <span className="visually-hidden">{label}</span>
    </button>
  );
}