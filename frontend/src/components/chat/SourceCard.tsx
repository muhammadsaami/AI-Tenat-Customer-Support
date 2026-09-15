import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";
import type { ChatSource } from "@/types/api";

export function SourceCard({
  source,
  rank,
  onClick,
  expandable = false,
}: {
  source: ChatSource;
  rank: number;
  onClick?: () => void;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    if (!expandable) return;
    e.stopPropagation();
    setExpanded((v) => !v);
  };

  return (
    <div className={`source-card${expandable && expanded ? " expanded" : ""} anim-message`} onClick={onClick}>
      <div className="file-line">
        <span className="rank">{rank + 1}</span>
        <span className="src-doc-icon"><FileText size={15} /></span>
        <span className="text-truncate text-sm" style={{ fontWeight: 600 }}>
          {source.filename}
        </span>
        <span className="dist" title="Vector distance (lower is closer)">
          d {source.distance.toFixed(2)}
        </span>
        {expandable && (
          <span className="src-chevron" onClick={toggle} aria-label={expanded ? "Collapse source" : "Expand source"}>
            <ChevronDown size={14} />
          </span>
        )}
      </div>
      <div className={`source-preview${expanded ? " expanded" : ""}`}>{source.preview}</div>
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <span className="src-meta">Chunk #{source.chunk_index + 1}</span>
        <span className="src-meta src-id" title={source.doc_id}>{source.doc_id.slice(0, 10)}…</span>
        <span className="src-relevance" title="Estimated relevance (1 - distance)">
          <span className="src-relevance-label">Relevance</span>
          <span className="src-relevance-track"><span className="src-relevance-fill" style={{ width: `${Math.round(Math.max(0, Math.min(1, 1 - source.distance)) * 100)}%` }} /></span>
        </span>
      </div>
    </div>
  );
}