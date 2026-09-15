import { cn } from "@/lib/util";

export function Card({
  className,
  hover = false,
  padded = false,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={cn("card", hover && "card-hover", padded && "card-pad", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card-header", className)}>
      <div style={{ minWidth: 0 }}>
        <div className="card-title">{title}</div>
        {subtitle && (
          <div className="text-sm text-muted mt-1">{subtitle}</div>
        )}
      </div>
      {action}
    </div>
  );
}