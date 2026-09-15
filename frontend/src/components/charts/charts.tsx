// SupportPilot data-chart primitives.
// These render real data only. When no data is provided they show a
// labeled empty state — no fabricated numbers ever.

import { BarChart3 } from "lucide-react";
import { clamp } from "@/lib/util";

const PALETTE = ["#6366f1", "#8b5cf6", "#a78bfa", "#818cf8", "#c4b5fd", "#6d28d9"];

function EmptyChart({
  label,
  height,
}: {
  label: string;
  height: number;
}) {
  return (
    <div
      style={{ height, display: "grid", placeItems: "center" }}
      className="state-box"
    >
      <BarChart3 size={22} style={{ color: "var(--text-muted)" }} />
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

export interface ChartDatum {
  label: string;
  value: number;
}

export function BarChart({
  data,
  height = 220,
  color,
}: {
  data: ChartDatum[];
  height?: number;
  color?: string;
}) {
  const W = 480;
  const H = 200;
  const pad = 28;

  if (!data.length) {
    return <EmptyChart label="No chart data yet — this will populate from backend analytics." height={height} />;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const slot = (W - pad * 2) / n;
  const bw = Math.min(slot * 0.56, 44);

  return (
    <div style={{ width: "100%", height, display: "grid", gridTemplateRows: "1fr auto", gap: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }} role="img" aria-label="bar chart">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={H - 20 - (H - 40) * f} y2={H - 20 - (H - 40) * f} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const h = clamp((d.value / max) * (H - 60), 4, H - 60);
          const x = pad + slot * i + (slot - bw) / 2;
          const y = H - 20 - h;
          return <rect key={i} x={x} y={y} width={bw} height={h} rx={Math.min(6, bw / 3)} fill={color ?? PALETTE[i % PALETTE.length]} opacity={0.92} />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden" }}>
        {data.map((d, i) => (
          <span key={i} className="text-truncate" style={{ flex: 1, textAlign: i === 0 ? "left" : i === n - 1 ? "right" : "center", padding: "0 2px" }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function LineChart({
  data,
  height = 220,
}: {
  data: ChartDatum[];
  height?: number;
}) {
  const W = 480;
  const H = 200;
  const pad = 28;

  if (!data.length) {
    return <EmptyChart label="No trend data yet — this will populate from backend analytics." height={height} />;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const step = n > 1 ? (W - pad * 2) / (n - 1) : 0;
  const pts = data.map((d, i) => {
    const x = pad + step * i;
    const y = H - 20 - clamp((d.value / max) * (H - 60), 4, H - 60);
    return `${x},${y}`;
  });

  return (
    <div style={{ width: "100%", height, display: "grid", gridTemplateRows: "1fr auto", gap: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }} role="img" aria-label="line chart">
        <defs>
          <linearGradient id="sp-line-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={H - 20 - (H - 40) * f} y2={H - 20 - (H - 40) * f} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        <polygon points={`${pad},${H - 20} ${pts.join(" ")} ${W - pad},${H - 20}`} fill="url(#sp-line-fill)" />
        <polyline points={pts.join(" ")} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const [x, y] = p.split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.2" />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-muted)" }}>
        <span>{data[0]?.label}</span>
        <span>{data[n - 1]?.label}</span>
      </div>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  size = 168,
}: {
  segments: DonutSegment[];
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  if (!total) {
    return <EmptyChart label="No composition data yet." height={size} />;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={size} height={size} role="img" aria-label="donut chart">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * c;
          const off = -acc * c - c * 0.25;
          acc += frac;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(dash - 2, 0.5)} ${c - Math.max(dash - 2, 0.5)}`}
              strokeDashoffset={off}
              strokeLinecap="butt"
            />
          );
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">
          {total.toLocaleString()}
        </text>
        <text x="50%" y="58%" textAnchor="middle" fontSize="11" fill="var(--text-muted)">
          total
        </text>
      </svg>
      <div style={{ display: "grid", gap: 8 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span className="text-secondary">{s.label}</span>
            <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}