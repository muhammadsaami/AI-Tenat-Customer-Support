import {
  FolderUp,
  MessageSquare,
  DatabaseZap,
  UserPlus,
  Server,
  Search,
} from "lucide-react";
import type { ActivityItem } from "@/services/mock/data";
import { timeAgo } from "@/lib/util";

const ICONS: Record<ActivityItem["type"], React.ReactNode> = {
  upload: <FolderUp size={13} />,
  chat: <MessageSquare size={13} />,
  index: <DatabaseZap size={13} />,
  user: <UserPlus size={13} />,
  system: <Server size={13} />,
  search: <Search size={13} />,
};

export function ActivityFeed({
  items,
  dense = false,
}: {
  items: ActivityItem[];
  dense?: boolean;
}) {
  return (
    <div className={dense ? "" : "timeline"} style={dense ? { padding: "8px 20px 14px" } : undefined}>
      {dense
        ? items.map((a) => (
            <div key={a.id} className="row" style={{ padding: "11px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
              <span className={`tl-dot`} style={{ position: "static", width: 30, height: 30, borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
                {ICONS[a.type]}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="text-sm text-truncate" style={{ fontWeight: 600 }}>{a.title}</div>
                {a.description && <div className="text-xs text-muted text-truncate">{a.description}</div>}
              </div>
              <span className="text-xs text-muted shrink-0">{timeAgo(a.time)}</span>
            </div>
          ))
        : items.map((a) => (
            <div key={a.id} className={`tl-item ${a.type}`}>
              <span className="tl-dot">{ICONS[a.type]}</span>
              <div className="text-sm" style={{ fontWeight: 600 }}>{a.title}</div>
              {a.description && <div className="text-xs text-muted">{a.description}</div>}
              <div className="text-xs text-muted mt-1">
                {a.actor ? `${a.actor} · ` : ""}
                {timeAgo(a.time)}
              </div>
            </div>
          ))}
    </div>
  );
}