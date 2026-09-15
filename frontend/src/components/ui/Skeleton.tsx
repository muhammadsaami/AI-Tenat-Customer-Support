import { cn } from "@/lib/util";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={cn("skeleton", className)} style={style} aria-hidden="true" />;
}

export function SkeletonText({ width, rows = 1 }: { width?: React.CSSProperties["width"]; rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} style={{ height: 14, width: i === rows - 1 ? (width ?? "60%") : "100%" }} />
      ))}
    </div>
  );
}