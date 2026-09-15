import { cn } from "@/lib/util";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-ghost"
  | "gradient";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  block = false,
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn",
        `btn-${variant}`,
        size !== "md" && `btn-${size}`,
        block && "btn-block",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="btn-spinner" /> : icon}
      {children}
    </button>
  );
}

export function Spinner({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={cn("spinner", className)} style={style} aria-hidden="true" />;
}