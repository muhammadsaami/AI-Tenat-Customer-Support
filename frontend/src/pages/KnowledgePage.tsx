import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Database,
  FileText,
  Search,
  Plus,
  Clock3,
  Languages,
  ShieldCheck,
  SlidersHorizontal,
  FolderHeart,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { collections } from "@/services/mock/data";
import { useDocuments } from "@/hooks/useDocuments";
import { isMockMode } from "@/services/api/client";
import { useToast } from "@/context/ToastProvider";
import { timeAgo } from "@/lib/util";

export function KnowledgePage() {
  const { push } = useToast();
  const { docs, stats, loading } = useDocuments();
  const demo = isMockMode();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "synced" | "building">("all");

  const q = query.trim().toLowerCase();
  const kb = collections.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(q);
    if (tab === "synced") return nameMatch && c.docCount > 10;
    if (tab === "building") return nameMatch && c.docCount <= 10;
    return nameMatch;
  });
  const recent = [...docs]
    .filter((d) => d.status === "ready")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="container-page">
      <PageHeader
        title="Knowledge Base"
        subtitle="Organize indexed knowledge into collections. Retrieve confident answers from them."
        actions={
          <Button onClick={() => push({ type: "info", title: "New collection", description: "Collection creation will be available once the collections API is connected." })}>
            <Plus size={16} />
            New collection
          </Button>
        }
      />

      <div className="row" style={{ gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div className="input" style={{ width: "min(360px, 100%)", flex: 1 }}>
          <Search size={15} />
          <input placeholder="Search collections…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="segmented">
          {([
            { key: "all", label: "All" },
            { key: "synced", label: "Synced" },
            { key: "building", label: "Building" },
          ] as const).map((t) => (
            <button key={t.key} aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {demo ? (
        <>
          <div className="kb-grid">
            {kb.map((c) => {
              const ready = c.docCount > 10;
              return (
                <Card key={c.id} hover padded className="kb-card">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="kb-accent" style={{ background: c.accent }} />
                    <Badge tone={ready ? "ok" : "warn"} dot={ready}>
                      {ready ? "Synced" : "Building"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="row" style={{ gap: 8 }}><FolderHeart size={17} style={{ color: c.accent }} /> {c.name}</h3>
                    <p>{c.description}</p>
                  </div>
                  <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                    <Badge tone="neutral"><FileText size={12} /> {c.docCount} docs</Badge>
                    {ready && <Badge tone="primary"><ShieldCheck size={12} /> Grounded</Badge>}
                  </div>
                  <div className="row" style={{ justifyContent: "space-between", marginTop: "auto" }}>
                    <span className="text-xs text-muted">Updated {timeAgo(c.updatedAt)}</span>
                    <Link to="/documents" className="text-sm" style={{ fontWeight: 600 }}>Browse →</Link>
                  </div>
                </Card>
              );
            })}
          </div>
          {kb.length === 0 && (
            <div className="mt-6">
              <EmptyState icon={<Database size={22} />} title="No collections match" description="Try a different search, or create a new collection." />
            </div>
          )}
        </>
      ) : (
        <div className="mt-2">
          <EmptyState
            icon={<FolderHeart size={22} />}
            title="Collections will appear here"
            description="The backend indexes documents per workspace. Collection management will be wired once the collections API is available."
          />
        </div>
      )}

      <Card className="mt-6">
        <div className="card-header">
          <div>
            <div className="card-title">Recently indexed documents</div>
            <div className="text-sm text-muted mt-1">Ready to answer from — {loading ? "…" : stats.indexedDocuments} total</div>
          </div>
          <Link to="/documents" className="text-sm" style={{ fontWeight: 600 }}>Manage documents</Link>
        </div>
        <div style={{ padding: "6px 20px 12px" }}>
          {loading ? (
            <div className="stack" style={{ padding: 8 }}>
              {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
            </div>
          ) : recent.map((d) => (
            <div key={d.id} className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
              <span className="doc-file-icon"><FileText size={16} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="text-sm text-truncate" style={{ fontWeight: 600 }}>{d.filename}</div>
                <div className="text-xs text-muted">{d.chunk_count} chunks · {timeAgo(d.created_at)}</div>
              </div>
              <Badge tone="ok" dot>Ready</Badge>
            </div>
          ))}
          {!loading && recent.length === 0 && (
            <div className="text-sm text-muted" style={{ padding: "16px 0" }}>Nothing indexed yet. Upload a PDF and it will be searchable here.</div>
          )}
        </div>
      </Card>

      <div className="grid mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <InfoTile icon={<Languages size={18} />} title="Language support" text="Extract and index knowledge across the languages you operate in." />
        <InfoTile icon={<SlidersHorizontal size={18} />} title="Fine-tune retrieval" text="Adjust top-k and distance thresholds per collection once live." />
        <InfoTile icon={<Clock3 size={18} />} title="Stay current" text="Re-index on schedule to keep answers in sync with your docs." />
      </div>
    </div>
  );
}

function InfoTile({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card padded>
      <span className="stat-icon" style={{ marginBottom: 12 }}>{icon}</span>
      <div className="text-sm" style={{ fontWeight: 700 }}>{title}</div>
      <p className="text-sm text-muted" style={{ marginTop: 4 }}>{text}</p>
    </Card>
  );
}