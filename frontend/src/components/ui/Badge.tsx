import { cn } from "@/lib/util";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "ok"
  | "warn"
  | "danger"
  | "info";

export function Badge({
  tone = "neutral",
  children,
  dot,
  className,
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("badge", `badge-${tone}`, className)}>
      {dot && <span className="dot" aria-hidden="true" />}
      {children}
    </span>
  );
}