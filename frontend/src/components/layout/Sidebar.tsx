import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Database,
  Activity,
  ChartColumn,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useDocuments } from "@/hooks/useDocuments";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { initials } from "@/lib/util";

const MAIN_NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/knowledge", label: "Knowledge Base", icon: Database },
];

const WORKSPACE_NAV = [
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: ChartColumn },
];

export function SystemStatusChip() {
  const { ready, loading, operational } = useSystemHealth();
  const degraded = ready !== null && !operational;

  return (
    <NavLink to="/analytics" className="system-status" title="System status">
      <span className={`status-led${loading || degraded ? " warn" : ready === null ? " warn" : ""}`} />
      <span className="system-status-label" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {loading ? "Checking services…" : degraded ? "Partial outage" : "All systems operational"}
      </span>
    </NavLink>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user } = useAuth();
  const { docs } = useDocuments();
  const processingCount = docs.filter((d) => d.status === "processing").length;

  return (
    <>
      {mobileOpen && <div className="sidebar-scrim" onClick={onCloseMobile} />}
      <aside className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Sparkles size={17} />
          </span>
          {!collapsed && <span className="brand-name">SupportPilot</span>}
          <button
            className="btn btn-ghost btn-icon collapse-btn"
            style={{ marginLeft: "auto", color: "var(--sidebar-text)" }}
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav aria-label="Main navigation">
          <div className="nav-section">
            <div className="nav-label">Workspace</div>
            {MAIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={onCloseMobile}
              >
                <item.icon />
                <span className="nav-text">{item.label}</span>
                {item.to === "/documents" && processingCount > 0 && (
                  <span className="nav-badge">{processingCount}</span>
                )}
              </NavLink>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-label">Insights</div>
            {WORKSPACE_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={onCloseMobile}
              >
                <item.icon />
                <span className="nav-text">{item.label}</span>
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={onCloseMobile}
            >
              <Settings />
              <span className="nav-text">Settings</span>
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-footer">
          <SystemStatusChip />
          <div className="sidebar-user">
            <span className="avatar" style={{ background: "var(--brand-gradient)", color: "#fff", flexShrink: 0 }}>
              {user ? initials(user.name) : "?"}
            </span>
            <div className="sidebar-user-info">
              <span className="name text-truncate">{user?.name ?? "Guest"}</span>
              <span className="role">{(user?.role ?? "admin").charAt(0).toUpperCase() + (user?.role ?? "admin").slice(1)}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}