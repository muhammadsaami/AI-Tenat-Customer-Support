import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FolderOpen,
  Sparkles,
  MessageSquare,
  ArrowRight,
  FolderHeart,
  Activity as ActivityIcon,
  CircleCheck,
  Clock3,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { SourceCard } from "@/components/chat/SourceCard";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { collections, activity } from "@/services/mock/data";
import { useDocuments } from "@/hooks/useDocuments";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { isMockMode } from "@/services/api/client";
import { services } from "@/services/service";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { errorMessage } from "@/lib/errors";
import { timeAgo } from "@/lib/util";
import type { ChatSource } from "@/types/api";

const DEMO_SUGGESTIONS = [
  "What is Muhammad Sami's AI background?",
  "Summarize the onboarding handbook",
  "What does the support FAQ cover?",
];

const LIVE_SUGGESTIONS = [
  "Summarize my most recent document",
  "What topics are covered in my knowledge base?",
  "What do my documents say about customer returns?",
];

const SUGGESTIONS = (demo: boolean) => (demo ? DEMO_SUGGESTIONS : LIVE_SUGGESTIONS);

const STATUS_ROWS: { key: string; label: string }[] = [
  { key: "postgres", label: "PostgreSQL" },
  { key: "chroma", label: "Vector store" },
  { key: "redis", label: "Redis" },
];

const STATUS_TONES: Record<string, "ok" | "warn" | "neutral" | "info"> = {
  ok: "ok",
  ready: "ok",
  healthy: "ok",
  not_configured: "neutral",
  loading: "info",
};

export function OverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const { docs, loading: docsLoading, stats, error: docsError, refresh: refreshDocs } = useDocuments();
  const { ready, loading: healthLoading, error: healthError, refresh: refreshHealth } = useSystemHealth();
  const demo = isMockMode();

  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const send = async (text: string) => {
    setLoading(true);
    setAnswer(null);
    setSources([]);
    setChatError(null);
    try {
      const res = await services.chat.send({ question: text });
      setAnswer(res.answer);
      setSources(res.sources);
    } catch (err) {
      const msg = errorMessage(err, "The assistant could not answer right now.");
      setChatError(msg);
      push({ type: "error", title: "Request failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const checks = (ready?.checks ?? {}) as Record<string, string>;

  return (
    <div className="container-page">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        subtitle="Your AI assistant is ready — ask it anything from your knowledge base."
        actions={
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => navigate("/documents")}>
              <FolderOpen size={16} />
              Upload documents
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/chat")}>
              <MessageSquare size={16} />
              Open chat
            </button>
          </div>
        }
      />

      <section className="hero anim-rise">
        <div className="hero-ornament" />
        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          <span className="badge" style={{ background: "rgba(99,102,241,0.2)", color: "#c7d2fe" }}>
            <Sparkles size={12} /> AI Knowledge Assistant
          </span>
        </div>
        <h2>
          Your team&apos;s knowledge, <span className="accent">ready to answer back.</span>
        </h2>
        <p>
          Upload documents once, retrieve grounded answers in seconds. Every response is
          backed by real sources — nothing is invented.
        </p>
        <ChatComposer
          onSend={send}
          loading={loading}
          suggestions={SUGGESTIONS(demo)}
          className="anim-rise"
        />
        {loading && (
          <div className="row text-sm" style={{ marginTop: 14, color: "#c7d2fe", gap: 8 }}>
            <span className="thinking-dots"><span /><span /><span /></span>
            Retrieving chunks, comparing with the vector index…
          </div>
        )}
        {chatError && !loading && (
          <div className="field-error" role="alert" style={{ marginTop: 14 }}>
            {chatError}
          </div>
        )}
        {answer && !loading && !chatError && (
          <div className="state-box" style={{ marginTop: 16, textAlign: "left", borderColor: "var(--border)", background: "rgba(18,26,43,0.55)", borderStyle: "solid" }}>
            <div className="text-sm" style={{ color: "#eef2f9", lineHeight: 1.65 }}>{answer}</div>
            {sources.length > 0 && (
              <div style={{ width: "100%" }}>
                <div className="text-xs" style={{ color: "#93a2bb", fontWeight: 700, marginBottom: 8 }}>
                  Sources ({sources.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {sources.slice(0, 3).map((s, i) => (
                    <SourceCard key={i} source={s} rank={i} onClick={() => navigate("/documents")} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="stat-grid mt-6">
        <Card padded className="stat-card">
          <span className="stat-icon"><FolderOpen size={19} /></span>
          <span className="stat-value">{docsLoading ? "—" : stats.documents}</span>
          <span className="stat-label">Documents in workspace</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><CircleCheck size={19} /></span>
          <span className="stat-value">{docsLoading ? "—" : stats.indexedDocuments}</span>
          <span className="stat-label">Indexed &amp; searchable</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><FileText size={19} /></span>
          <span className="stat-value">{docsLoading ? "—" : stats.totalChunks}</span>
          <span className="stat-label">Indexed chunks</span>
        </Card>
        <Card padded className="stat-card">
          <span className="stat-icon"><FolderHeart size={19} /></span>
          <span className="stat-value">{demo ? stats.documents : "—"}</span>
          <span className="stat-label">Knowledge collections</span>
        </Card>
      </div>

      <div className="grid-split mt-6">
        <Card>
          <CardHeader
            title="Recent documents"
            subtitle="Latest uploads and their indexing status"
            action={
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/documents")}>
                View all <ArrowRight size={14} />
              </button>
            }
          />
          <div style={{ padding: "6px 20px 12px" }}>
            {docsLoading ? (
              <div className="stack" style={{ padding: 8 }}>
                {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
              </div>
            ) : docsError ? (
              <div style={{ padding: "10px 4px" }}>
                <div className="field-error" role="alert">
                  {errorMessage(docsError, "Could not load documents.")}
                </div>
                <button className="btn btn-ghost btn-sm mt-2" style={{ marginLeft: 0 }} onClick={refreshDocs}>
                  Try again
                </button>
              </div>
            ) : docs.length === 0 ? (
              <div className="text-sm text-muted" style={{ padding: "14px 4px" }}>
                Nothing uploaded yet. Add a PDF to start building your knowledge base.
              </div>
            ) : (
              docs.slice(0, 4).map((d) => (
                <div key={d.id} className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
                  <span className="doc-file-icon"><FileText size={17} /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="text-sm text-truncate" style={{ fontWeight: 600 }}>{d.filename}</div>
                    <div className="text-xs text-muted">
                      {timeAgo(d.created_at)} · {d.chunk_count ? `${d.chunk_count} indexed chunks` : "not indexed yet"}
                    </div>
                  </div>
                  <DocStatus status={d.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Activity"
            action={
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/activity")}>
                View all <ArrowRight size={14} />
              </button>
            }
          />
          {demo ? (
            <ActivityFeed items={activity.slice(0, 4)} dense />
          ) : (
            <div style={{ padding: "16px 20px" }}>
              <EmptyState
                icon={<ActivityIcon size={22} />}
                title="Live activity coming"
                description="Upload and chat events will appear here as the workspace stays in sync with the backend."
              />
            </div>
          )}
        </Card>
      </div>

      <div className="grid-split-equal mt-6">
        {demo ? (
          <Card padded>
            <div className="section-title"><FolderHeart size={17} /> Knowledge collections</div>
            <div style={{ display: "grid", gap: 12 }}>
              {collections.slice(0, 3).map((c) => (
                <button key={c.id} className="row" style={{ width: "100%", border: "none", background: "var(--surface-2)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", gap: 12, textAlign: "left" }} onClick={() => navigate("/knowledge")}>
                  <span className="kb-accent" style={{ width: 30, height: 30, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <FolderOpen size={16} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="text-sm" style={{ fontWeight: 600, display: "block" }}>{c.name}</span>
                    <span className="text-xs text-muted">{c.docCount} documents</span>
                  </span>
                  <Badge tone={c.docCount > 15 ? "ok" : "neutral"}>{c.docCount > 15 ? "Synced" : "Indexed"}</Badge>
                </button>
              ))}
            </div>
          </Card>
        ) : (
          <Card padded>
            <div className="section-title"><FolderHeart size={17} /> Knowledge collections</div>
            <div style={{ padding: "8px 0" }}>
              <EmptyState
                icon={<FolderHeart size={22} />}
                title="No collections yet"
                description="Docs are indexed per workspace. Collection management will be wired when the collections API is available."
              />
            </div>
          </Card>
        )}

        <Card padded>
          <div className="section-title"><ActivityIcon size={17} /> System status</div>
          <div style={{ display: "grid", gap: 10 }}>
            {healthLoading ? (
              <div className="text-sm text-muted">Checking services…</div>
            ) : healthError ? (
              <div className="field-error" role="alert">
                {errorMessage(healthError, "Readiness check failed.")}
                <button className="btn btn-ghost btn-sm mt-2" style={{ marginLeft: 0 }} onClick={refreshHealth}>
                  Retry
                </button>
              </div>
            ) : (
              STATUS_ROWS.map((r) => {
                const v = checks[r.key];
                const tone = v === undefined ? "neutral" : (STATUS_TONES[v] ?? "neutral");
                return (
                  <div key={r.key} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                    <Badge tone={tone} dot>{v === undefined ? "unknown" : v}</Badge>
                  </div>
                );
              })
            )}
            {!healthLoading && !healthError && (
              <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Embedding model</span>
                <Badge tone="info" dot>loads on demand</Badge>
              </div>
            )}
          </div>
          <button className="btn btn-secondary btn-sm btn-block mt-4" onClick={() => navigate("/analytics")}>
            View full status
          </button>
        </Card>
      </div>
    </div>
  );
}

function DocStatus({ status }: { status: "processing" | "ready" | "failed" }) {
  if (status === "ready") return <Badge tone="ok" dot>Indexed</Badge>;
  if (status === "failed") return <Badge tone="danger" dot>Failed</Badge>;
  return <Badge tone="warn" dot><span className="row" style={{ gap: 6 }}><Clock3 size={12} /> Processing</span></Badge>;
}