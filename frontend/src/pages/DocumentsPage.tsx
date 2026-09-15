import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  File as FileIcon,
  Search,
  MoreHorizontal,
  ArrowDown,
  Clock3,
  Trash2,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Menu as Dropdown } from "@/components/ui/Menu";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { services } from "@/services/service";
import { useToast } from "@/context/ToastProvider";
import { errorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime, timeAgo, uid } from "@/lib/util";
import type { DocumentOut } from "@/types/api";

const ACCEPT = ".pdf";

type SortMode = "newest" | "oldest" | "name";

const SORT_LABEL: Record<SortMode, string> = {
  newest: "Newest",
  oldest: "Oldest",
  name: "Name A–Z",
};

interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "indexing" | "done" | "failed";
  error?: string;
}

export function DocumentsPage() {
  const { push } = useToast();
  const [docs, setDocs] = useState<DocumentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [dragging, setDragging] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [selected, setSelected] = useState<DocumentOut | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await services.documents.list();
      setDocs(data);
    } catch (err) {
      setDocs([]);
      setLoadError(errorMessage(err, "Could not load documents."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startUpload = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => {
      const ok = ACCEPT.split(",").some((ext) =>
        f.name.toLowerCase().endsWith(ext.trim())
      );
      if (!ok) {
        push({ type: "error", title: "Unsupported file", description: `${f.name} — use ${ACCEPT}.` });
      }
      return ok;
    });
    if (!incoming.length) return;

    incoming.forEach((f) => {
      const taskId = uid("task");
      const task: UploadTask = {
        id: taskId,
        name: f.name,
        size: f.size,
        progress: 0,
        status: "uploading",
      };
      setTasks((prev) => [...prev, task]);

      (async () => {
        try {
          const doc = await services.documents.upload(f);
          if (doc.status === "failed") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? { ...t, status: "failed", error: "Ingestion failed on the server." }
                  : t
              )
            );
            push({ type: "error", title: `${f.name} failed to ingest`, description: "The server could not parse or index this file." });
          } else {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? { ...t, progress: 100, status: doc.status === "ready" ? "done" : "indexing" }
                  : t
              )
            );
            if (doc.status === "ready") {
              push({
                type: "success",
                title: `${f.name} indexed`,
                description: `${doc.chunk_count ?? 0} chunks stored and searchable.`,
              });
            }
          }
          load();
        } catch (err) {
          const detail = errorMessage(err, "File could not be ingested.");
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: "failed", error: detail }
                : t
            )
          );
          push({ type: "error", title: `${f.name} failed`, description: detail });
        }
      })();
    });
  };

  const clearTasks = () =>
    setTasks((prev) =>
      prev.filter((t) => t.status === "uploading" || t.status === "indexing")
    );

  const q = query.trim().toLowerCase();
  const visible = docs.filter((d) => d.filename.toLowerCase().includes(q));
  const ready = docs.filter((d) => d.status === "ready").length;
  const processing = docs.filter((d) => d.status === "processing").length;
  const failed = docs.filter((d) => d.status === "failed").length;
  const busyCount = tasks.filter((t) => t.status === "uploading" || t.status === "indexing").length;

  const sort = (mode: SortMode) => {
    setSortMode(mode);
    setDocs((prev) => {
      const copy = [...prev];
      if (mode === "newest") copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (mode === "oldest") copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      if (mode === "name") copy.sort((a, b) => a.filename.localeCompare(b.filename));
      return copy;
    });
  };

  return (
    <div className="container-page">
      <PageHeader
        title="Documents"
        subtitle={`${ready} of ${docs.length} documents indexed and ready to answer from.`}
        actions={
          <Button onClick={() => inputRef.current?.click()}>
            <UploadCloud size={16} />
            Upload file
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          if (e.target.files) startUpload(e.target.files);
          e.target.value = "";
        }}
      />

      {docs.length > 0 && (
        <div className="doc-stats">
          <div className="doc-stat">
            <span className="ds-ico ok"><CheckCircle2 size={18} /></span>
            <div>
              <div className="ds-num">{ready}</div>
              <div className="ds-label">Indexed &amp; searchable</div>
            </div>
          </div>
          <div className="doc-stat">
            <span className="ds-ico warn"><Clock3 size={18} /></span>
            <div>
              <div className="ds-num">{processing}</div>
              <div className="ds-label">Processing</div>
            </div>
          </div>
          <div className="doc-stat">
            <span className="ds-ico danger"><AlertTriangle size={18} /></span>
            <div>
              <div className="ds-num">{failed}</div>
              <div className="ds-label">Failed</div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`upload-zone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          startUpload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Upload files"
        aria-describedby="drop-zone-hint"
      >
        <div className="drop-icon"><UploadCloud size={26} /></div>
        <div className="drop-title">Drag &amp; drop a PDF, or click to browse</div>
        <div className="drop-hint" id="drop-zone-hint">
          <span className="drop-badge">PDF only</span>
          <span aria-hidden="true">·</span>
          <span>Up to 10 MB per file</span>
        </div>
      </div>

      {tasks.length > 0 && (
        <Card className="mt-4" padded>
          <div className="uploads-head">
            <div className="section-title">
              <FolderOpen size={17} /> Pending uploads
            </div>
            {busyCount > 0 && <Badge tone="primary" dot>Working</Badge>}
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearTasks}
              disabled={busyCount > 0}
              style={{ marginLeft: "auto" }}
            >
              <X size={14} /> Clear finished
            </button>
          </div>
          <div className="stack" style={{ "--gap": "0px" } as React.CSSProperties}>
            {tasks.map((t) => {
              const busy = t.status === "uploading" || t.status === "indexing";
              return (
                <div key={t.id} className="upload-task">
                  <span className="ut-icon" aria-hidden="true">
                    {t.status === "done" ? <Check size={18} />
                      : t.status === "failed" ? <AlertTriangle size={18} />
                      : t.status === "uploading" ? <UploadCloud size={18} />
                      : <FileText size={18} />}
                  </span>
                  <div className="ut-body">
                    <div className="ut-name">
                      <span className="text-truncate">{t.name}</span>
                      <span className="ut-sub">{formatBytes(t.size)}</span>
                    </div>
                    <div className="row" style={{ justifyContent: "space-between", gap: 10, marginTop: 2 }}>
                      <span className="text-sm text-secondary">
                        {t.status === "done" ? "Indexed and ready for retrieval"
                          : t.status === "failed" ? (t.error ?? "Upload failed")
                          : t.status === "uploading" ? "Sending to server…"
                          : "Chunking and indexing…"}
                      </span>
                      {t.status === "done" ? <Badge tone="ok" dot>Ready</Badge>
                        : t.status === "failed" ? <Badge tone="danger" dot>Failed</Badge>
                        : <Badge tone="warn" dot><Clock3 size={12} /> {t.status === "uploading" ? "Uploading" : "Indexing"}</Badge>}
                    </div>
                    <div className="progress" style={{ height: 5 }}>
                      <div className={`bar${busy ? " indeterminate" : ""}`} style={busy ? undefined : { width: `${t.progress}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title={
            <span className="row" style={{ gap: 8 }}>
              <FolderOpen size={17} /> All documents
            </span>
          }
          subtitle={
            <span className="doc-toolbar-sub">
              {visible.length} of {docs.length} shown
              {q && ` · filtered by “${query.trim()}”`}
            </span>
          }
          action={
            <div className="row" style={{ gap: 10 }}>
              <div className="input" style={{ maxWidth: 260, width: "100%" }}>
                <Search size={15} />
                <input
                  type="search"
                  placeholder="Filter by filename…"
                  aria-label="Filter documents by filename"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Dropdown
                trigger={({ toggle }) => (
                  <Button variant="secondary" size="sm" onClick={toggle} aria-label="Sort documents">
                    <ArrowDown size={15} />
                    {SORT_LABEL[sortMode]}
                  </Button>
                )}
                items={[
                  { label: "Newest first", onClick: () => sort("newest") },
                  { label: "Oldest first", onClick: () => sort("oldest") },
                  { label: "Name A–Z", onClick: () => sort("name") },
                ]}
              />
            </div>
          }
        />

        {loading ? (
          <div className="stack" style={{ gap: 0 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="doc-skel-row">
                <span className="skeleton sk-ico" />
                <span className="flex-1">
                  <span className="skeleton sk-name" style={{ display: "block" }} />
                  <span className="skeleton sk-meta" style={{ display: "block", marginTop: 8 }} />
                </span>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div style={{ padding: "24px 20px 28px" }}>
            <ErrorState title="Could not load documents" description={loadError} onRetry={load} />
          </div>
        ) : visible.length === 0 ? (
          <div className="doc-empty" style={{ padding: "24px 20px 28px" }}>
            <EmptyState
              icon={<FileText size={22} />}
              title={q ? "No documents match your filter" : "No documents yet"}
              description={
                q
                  ? "Try a different filename, or clear the search filter."
                  : "Upload your first PDF to start building a knowledge base you can ask questions about."
              }
              action={!q ? <Button size="sm" onClick={() => inputRef.current?.click()}><UploadCloud size={15} /> Upload your first file</Button> : undefined}
            />
          </div>
        ) : (
          <table className="doc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Chunks</th>
                <th>Uploaded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(d);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`View details for ${d.filename}`}
                >
                  <td data-label="Name">
                    <div className="doc-name-cell">
                      <span className="doc-file-icon" aria-hidden="true"><FileIcon size={17} /></span>
                      <span className="text-truncate" style={{ fontWeight: 600, maxWidth: 420 }}>{d.filename}</span>
                    </div>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={d.status} />
                  </td>
                  <td data-label="Chunks">
                    <span className={`doc-chunks${d.chunk_count ? "" : " empty"}`}>
                      <FileText size={13} aria-hidden="true" /> {d.chunk_count ?? 0}
                    </span>
                  </td>
                  <td data-label="Uploaded" className="text-secondary text-sm">{formatDateTime(d.created_at)}</td>
                  <td data-label="">
                    <Dropdown
                      trigger={({ toggle }) => (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label="Document actions">
                          <MoreHorizontal size={17} />
                        </button>
                      )}
                      items={[
                        { label: "View details", onClick: () => setSelected(d) },
                        { label: "Copy document ID", onClick: () => navigator.clipboard?.writeText(d.id).catch(() => {}) },
                        "separator",
                        {
                          label: "Delete",
                          icon: <Trash2 size={15} />,
                          danger: true,
                          onClick: () => push({ type: "warn", title: "Delete not enabled", description: "Document deletion isn't exposed by the backend yet." }),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <DocumentDrawer doc={selected} onClose={() => setSelected(null)} onReindex={() => {
        push({ type: "info", title: "Re-index not enabled", description: "Re-indexing isn't wired to the ingestion pipeline yet." });
      }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: DocumentOut["status"] }) {
  if (status === "ready") return <Badge tone="ok" dot>Indexed</Badge>;
  if (status === "failed") return <Badge tone="danger" dot>Failed</Badge>;
  return <Badge tone="warn" dot>Processing</Badge>;
}

function DocumentDrawer({ doc, onClose, onReindex }: { doc: DocumentOut | null; onClose: () => void; onReindex: () => void }) {
  return (
    <Modal open={!!doc} onClose={onClose} title={doc?.filename} width={520}
      footer={
        doc && (
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="secondary" size="sm" onClick={onReindex}>
              <RefreshCw size={14} /> Re-index
            </Button>
          </div>
        )
      }
    >
      {doc && (
        <div className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
          <div className="row" style={{ gap: 14 }}>
            <span className="doc-hero-icon" aria-hidden="true"><FileText size={26} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="text-lg text-truncate" style={{ fontWeight: 700 }}>{doc.filename}</div>
              <div className="row" style={{ gap: 10, marginTop: 6 }}>
                <StatusBadge status={doc.status} />
                <span className="text-sm text-muted">{timeAgo(doc.created_at)}</span>
              </div>
            </div>
          </div>

          <hr className="fade-line" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoCell label="Document ID" value={<code style={{ fontSize: 12 }}>{doc.id}</code>} />
            <InfoCell label="Chunks indexed" value={`${doc.chunk_count ?? 0}`} />
            <InfoCell label="Status" value={doc.status} />
            <InfoCell label="Uploaded" value={formatDateTime(doc.created_at)} />
          </div>

          {doc.status === "ready" && (
            <>
              <hr className="fade-line" />
              <div className="preview-callout">
                <Sparkles size={17} className="tc-icon" aria-hidden="true" />
                <div>
                  <div className="text-sm" style={{ fontWeight: 700 }}>Preview mode</div>
                  <p className="text-sm text-secondary" style={{ marginTop: 4 }}>
                    Full text preview and per-chunk inspection will appear here once document
                    content retrieval is wired to the backend.
                  </p>
                </div>
              </div>
            </>
          )}

          <Link to="/chat" className="text-sm" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Ask about this document <ArrowDown size={14} style={{ transform: "rotate(-90deg)" }} />
          </Link>
        </div>
      )}
    </Modal>
  );
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="info-cell">
      <div className="ic-label">{label}</div>
      <div className="ic-value">{value}</div>
    </div>
  );
}