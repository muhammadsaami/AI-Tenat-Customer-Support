import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Moon, Search, Bell, Sun, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/context/ThemeProvider";
import { useToast } from "@/context/ToastProvider";
import { Menu as Dropdown } from "@/components/ui/Menu";
import { notifications } from "@/services/mock/data";
import { isMockMode } from "@/services/api/client";
import { initials } from "@/lib/util";

export function Header({
  onOpenMobile,
  onOpenCommand,
}: {
  onOpenMobile: () => void;
  onOpenCommand: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { push } = useToast();
  const navigate = useNavigate();
  const demo = isMockMode();
  const unread = demo ? notifications.filter((n) => n.unread).length : 0;

  const handleLogout = () => {
    logout();
    push({
      type: "info",
      title: "Signed out",
      description: demo
        ? "You have been signed out of this demo session."
        : "You have been signed out securely.",
    });
    navigate("/login");
  };

  return (
    <header className="header">
      <button
        className="header-icon-btn mobile-toggle"
        onClick={onOpenMobile}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <button
        className="global-search"
        onClick={onOpenCommand}
        aria-label="Open global search"
      >
        <Search size={16} />
        <span>Search documents, questions, commands…</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <button
          className="header-icon-btn"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Dropdown
          trigger={({ toggle }) => (
            <button className="header-icon-btn" onClick={toggle} aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="dot-badge" />}
            </button>
          )}
          items={[
            {
              label:
                unread > 0
                  ? `${unread} unread notification${unread === 1 ? "" : "s"}`
                  : demo
                    ? "No new notifications"
                    : "Notifications are not wired yet",
              onClick: () => {},
            },
            "separator",
            ...(demo ? notifications.map((n) => ({
              label: (
                <div style={{ display: "grid", gap: 1, minWidth: 220 }}>
                  <span style={{ fontWeight: 600 }}>{n.title}</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {n.description}
                  </span>
                </div>
              ),
              onClick: () => {},
            })) : []),
          ]}
        />

        <Dropdown
          trigger={({ toggle }) => (
            <button className="header-user" onClick={toggle} aria-label="Account menu">
              <span
                className="avatar"
                style={{ background: "var(--brand-gradient)", color: "#fff" }}
              >
                {user ? initials(user.name) : "?"}
              </span>
              {user && (
                <span className="who">
                  <span className="n">{user.name}</span>
                  <span className="e">{user.email}</span>
                </span>
              )}
              <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
          items={[
            { label: "View profile", onClick: () => navigate("/settings") },
            { label: "Workspace settings", onClick: () => navigate("/settings?tab=workspace") },
            "separator",
            {
              label: "Sign out",
              icon: <LogOut size={16} />,
              danger: true,
              onClick: handleLogout,
            },
          ]}
        />
      </div>
    </header>
  );
}