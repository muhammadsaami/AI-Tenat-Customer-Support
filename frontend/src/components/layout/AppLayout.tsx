import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Info, Search, FileText, MessageSquare, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useDocuments } from "@/hooks/useDocuments";
import { isMockMode } from "@/services/api/client";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="shell-main">
        {isMockMode() && (
          <div className="demo-banner">
            <Info size={13} />
            Demo workspace — showing sample data. VITE_USE_MOCK=false connects the FastAPI backend.
          </div>
        )}
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCommand={() => setPaletteOpen(true)}
        />
        <main className="shell-content" id="main">
          <Outlet />
        </main>
      </div>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}

const NAV_ACTIONS = [
  { label: "Open Chat", shortcut: "G C", to: "/chat" },
  { label: "Upload a document", shortcut: "G D", to: "/documents" },
  { label: "Knowledge Base", shortcut: "G K", to: "/knowledge" },
  { label: "Analytics", shortcut: "G A", to: "/analytics" },
];

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { docs } = useDocuments();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const docHits = docs.filter((d) => d.filename.toLowerCase().includes(q));
  const actionHits = NAV_ACTIONS.filter((a) => a.label.toLowerCase().includes(q));

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Search and commands" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="input" style={{ margin: 16, height: 46, fontSize: 15 }}>
          <Search size={17} />
          <input
            autoFocus
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ paddingTop: 0, maxHeight: "55vh", overflow: "auto" }}>
          {!q && (
            <>
              <div className="nav-label" style={{ margin: "4px 2px 6px" }}>Jump to</div>
              {NAV_ACTIONS.map((a) => (
                <button key={a.label} className="menu-item" onClick={() => go(a.to)}>
                  {a.label}
                  <kbd style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>{a.shortcut}</kbd>
                </button>
              ))}
            </>
          )}
          {q && (
            <>
              {actionHits.length === 0 && docHits.length === 0 && (
                <div className="text-sm text-muted" style={{ padding: "8px 4px" }}>
                  No results for “{query}”.
                </div>
              )}
              {actionHits.length > 0 && (
                <div className="nav-label" style={{ margin: "4px 2px 6px" }}>Actions</div>
              )}
              {actionHits.map((a) => (
                <button key={a.label} className="menu-item" onClick={() => go(a.to)}>
                  <MessageSquare size={15} />
                  {a.label}
                </button>
              ))}
              {docHits.length > 0 && (
                <div className="nav-label" style={{ margin: "10px 2px 6px" }}>Documents</div>
              )}
              {docHits.map((d) => (
                <button key={d.id} className="menu-item" onClick={() => go("/documents")}>
                  <FileText size={15} />
                  {d.filename}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}