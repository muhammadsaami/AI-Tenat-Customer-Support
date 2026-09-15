import { useState } from "react";
import {
  Server,
  FileText,
  MessagesSquare,
  ShieldCheck,
  Activity as ActivityIcon,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarChart, LineChart, Donut } from "@/components/charts/charts";
import { useDocuments } from "@/hooks/useDocuments";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { errorMessage } from "@/lib/errors";

const STATUS_ROWS: { key: string; label: string }[] = [
  { key: "postgres", label: "PostgreSQL" },
  { key: "chroma", label: "Vector store (Chroma)" },
  { key: "redis", label: "Redis" },
];

const TONE: Record<string, "ok" | "warn" | "neutral" | "info"> = {
  ok: "ok",
  ready: "ok",
  healthy: "ok",
  not_configured: "neutral",
  loading: "info",
};

export function AnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");
  const { stats, loading: docsLoading } = useDocuments();
  const { ready, loading: healthLoading, error: healthError, refresh } = useSystemHealth();

  const chartData: { label: string; value: number }[] = [];
  const checks = (ready?.checks ?? {}) as Record<string, string>;

  const note =
    "Only real data is shown. Question volume, latency, and accuracy will stream from backend metrics once available — nothing here is fabricated.";

  return (
    <div className="container-page">
      <PageHeader
        title="Analytics"
        subtitle={note}
        actions={
          <Segmented
            ariaLabel="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
            ]}
          />
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Card padded className="stat-card">
          <span className="stat-icon"><MessagesSquare size={19} /></span>
          <span className="stat-value">—</span>
          <span className="stat-label">Questions answered (this range)</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><FileText size={19} /></span>
          <span className="stat-value">{docsLoading ? "…" : stats.indexedDocuments}</span>
          <span className="stat-label">Documents indexed</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><Server size={19} /></span>
          <span className="stat-value">99.9%</span>
          <span className="stat-label">Uptime target (SLO)</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><ShieldCheck size={19} /></span>
          <span className="stat-value">—</span>
          <span className="stat-label">Grounded answer accuracy</span>
        </Card>
      </div>

      <div className="grid-split mt-6">
        <Card>
          <CardHeader
            title="Questions over time"
            subtitle="Will stream from real usage events."
            action={<Badge tone="primary">Chart ready</Badge>}
          />
          <div style={{ padding: "8px 20px 20px" }}>
            <LineChart data={chartData} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Source distribution" subtitle="Where answers come from." />
          <div style={{ padding: "8px 20px 20px" }}>
            <Donut segments={[]} />
          </div>
        </Card>
      </div>

      <div className="grid-split-equal mt-6">
        <Card>
          <CardHeader title="Documents by collection" subtitle="Indexed chunks per collection." />
          <div style={{ padding: "8px 20px 20px" }}>
            <BarChart data={[]} />
          </div>
        </Card>
        <Card>
          <CardHeader
            title="System health"
            subtitle={
              <div className="row wrap" style={{ gap: 6 }}>
                {STATUS_ROWS.map((r) => {
                  const v = checks[r.key];
                  return <Badge key={r.key} tone={v === "ok" ? "ok" : v === undefined ? "neutral" : "warn"} dot>{r.key}: {v ?? "unknown"}</Badge>;
                })}
              </div>
            }
          />
          <div style={{ padding: "8px 20px 20px", display: "grid", gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-sm text-secondary"><ActivityIcon size={14} style={{ verticalAlign: -2 }} /> Readiness check</span>
              {healthLoading ? (
                <Badge tone="info">Checking…</Badge>
              ) : connected(readinessValue(ready)) ? (
                <Badge tone="ok">Ready</Badge>
              ) : (
                <Badge tone="warn">Degraded / offline</Badge>
              )}
            </div>
            {healthError ? (
              <div className="field-error" role="alert" style={{ margin: "4px 0" }}>
                {errorMessage(healthError, "Readiness check failed.")}
              </div>
            ) : (
              STATUS_ROWS.map((r) => {
                const v = checks[r.key];
                return (
                  <div key={r.key} className="row" style={{ justifyContent: "space-between" }}>
                    <span className="text-sm text-secondary">{r.label}</span>
                    <Badge tone={v === undefined ? "neutral" : (TONE[v] ?? "warn")} dot>{v ?? "unknown"}</Badge>
                  </div>
                );
              })
            )}
            <div className="text-xs text-muted mt-2 row" style={{ gap: 8, justifyContent: "space-between" }}>
              <span>Mirrors <code>/health/ready</code> from the FastAPI backend.</span>
              <button className="btn btn-ghost btn-sm" onClick={refresh} aria-label="Refresh health">
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function readinessValue(ready: ReturnType<typeof useSystemHealth>["ready"]): string | null {
  return ready?.status ?? null;
}

function connected(status: string | null): boolean {
  return status === "ok" || status === "ready";
}