import { useEffect, useState } from "react";
import {
  User,
  Lock,
  Palette,
  Bell,
  Building2,
  Sun,
  Moon,
  LogOut,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/context/AuthProvider";
import { useTheme } from "@/context/ThemeProvider";
import { useToast } from "@/context/ToastProvider";
import { initials } from "@/lib/util";

type Tab = "profile" | "security" | "appearance" | "notifications" | "workspace";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Profile", icon: <User size={16} /> },
  { key: "security", label: "Security", icon: <Lock size={16} /> },
  { key: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  { key: "workspace", label: "Workspace", icon: <Building2 size={16} /> },
];

export function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t === "workspace" || t === "security" || t === "appearance" || t === "notifications") {
      setTab(t);
    }
  }, []);

  return (
    <div className="container-page">
      <PageHeader title="Settings" subtitle="Manage your profile, security, and workspace preferences." />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-section">
          {tab === "profile" && <ProfileSection name={user?.name ?? "Sara Ali"} email={user?.email ?? "sara@supportpilot.io"} role={user?.role ?? "admin"} />}
          {tab === "security" && <SecuritySection />}
          {tab === "appearance" && <AppearanceSection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "workspace" && <WorkspaceSection />}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="card-header"><div className="card-title">{title}</div></div>
      <div style={{ padding: "4px 20px 20px" }}>{children}</div>
    </Card>
  );
}

function ProfileSection({ name, email, role }: { name: string; email: string; role: string }) {
  const { push } = useToast();
  const [display, setDisplay] = useState(name);
  const [workEmail, setWorkEmail] = useState(email);

  return (
    <>
      <SectionCard title="Personal information">
        <div className="row" style={{ alignItems: "center", gap: 16, margin: "16px 0 20px" }}>
          <span className="settings-avatar">{initials(name)}</span>
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>{name}</div>
            <div className="text-xs text-muted">Profile photo syncs with the identity provider.</div>
            <button className="btn btn-secondary btn-sm mt-2" onClick={() => push({ type: "info", title: "Avatar upload", description: "Avatar upload will be wired to profile storage." })}>
              Change photo
            </button>
          </div>
        </div>
        <div className="grid-split-equal" style={{ gap: 16 }}>
          <Field label="Full name" htmlFor="settings-name">
            <Input id="settings-name" value={display} onChange={(e) => setDisplay(e.target.value)} autoComplete="name" />
          </Field>
          <Field label="Work email" htmlFor="settings-email">
            <Input id="settings-email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} type="email" autoComplete="email" />
          </Field>
        </div>
        <div className="row" style={{ marginTop: 18, justifyContent: "flex-end" }}>
          <Button size="sm" onClick={() => push({ type: "info", title: "Not saved", description: "Profile editing isn't wired to the backend yet — changes stay local to this page." })}>
            <Save size={14} /> Save changes
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Role & access">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Current role</div>
            <div className="text-xs text-muted mt-1">Controls what you can see and do.</div>
          </div>
          <Badge tone="primary">{role.charAt(0).toUpperCase() + role.slice(1)}</Badge>
        </div>
      </SectionCard>
    </>
  );
}

function SecuritySection() {
  const { push } = useToast();
  const enabled = false;

  return (
    <>
      <SectionCard title="Password">
        <div className="settings-row">
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Reset password</div>
            <div className="text-xs text-muted">Use at least 8 characters with a mix of cases.</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => push({ type: "info", title: "Password reset", description: "Reset flow will call the backend auth endpoint when wired." })}>
            Change password
          </Button>
        </div>
        <div className="settings-row">
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Session timeout</div>
            <div className="text-xs text-muted">Access tokens expire after 15 minutes; refresh tokens rotate on use.</div>
          </div>
          <Badge tone="ok">15 min access</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Active sessions">
        <div className="settings-row" style={{ borderBottom: "none" }}>
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Signed-in devices</div>
            <div className="text-xs text-muted">This device is active. The full session list will appear here once the backend exposes it.</div>
          </div>
          <Badge tone="ok">This device</Badge>
        </div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 0 }}>
          <Button variant="ghost" size="sm" onClick={() => push({ type: "info", title: "Sessions managed", description: "Revoke-all will call the backend logout endpoint when wired." })}>
            <LogOut size={14} /> Revoke all other sessions
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Two-factor authentication">
        <div className="settings-row">
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Require 2FA for admins</div>
            <div className="text-xs text-muted">Enforced when identity provider integration is enabled.</div>
          </div>
          <Switch checked={enabled} onChange={() => push({ type: "info", title: "2FA setting", description: "Will persist through the backend once connected." })} label="Require 2FA" />
        </div>
      </SectionCard>
    </>
  );
}

function AppearanceSection() {
  const { theme, toggle } = useTheme();
  const { push } = useToast();

  return (
    <SectionCard title="Appearance">
      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
        <ThemeOption active={theme === "light"} label="Light" icon={<Sun size={18} />} onClick={() => theme === "dark" && toggle()} />
        <ThemeOption active={theme === "dark"} label="Dark" icon={<Moon size={18} />} onClick={() => theme === "light" && toggle()} />
        <ThemeOption active icon={<Palette size={18} />} label="System" onClick={() => push({ type: "info", title: "System theme", description: "Currently bound to your OS preference." })} />
      </div>
      <div className="settings-row" style={{ marginTop: 10 }}>
        <div>
          <div className="text-sm" style={{ fontWeight: 600 }}>Accent color</div>
          <div className="text-xs text-muted">Brand gradient powered by the design token system.</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981"].map((c) => (
            <button key={c} aria-label={`Accent ${c}`} style={{ width: 22, height: 22, borderRadius: 7, background: c, border: "2px solid var(--surface)", boxShadow: "0 0 0 1.5px var(--border-strong)", cursor: "pointer" }} onClick={() => push({ type: "info", title: "Accent updated", description: "Accent theming drives the brand gradient." })} />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ThemeOption({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="state-box"
      style={{ width: 150, padding: "24px 12px", cursor: "pointer", borderColor: active ? "var(--primary)" : "var(--border)", borderStyle: "solid", background: active ? "var(--primary-softer)" : "var(--surface)" }}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="state-icon">{icon}</span>
      <span className="text-sm" style={{ fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function NotificationsSection() {
  const { push } = useToast();
  const [prefs, setPrefs] = useState({
    documentIndexed: true,
    documentFailed: true,
    mentions: true,
    weeklyDigest: false,
    productUpdates: false,
  });

  const togglePref = (key: keyof typeof prefs, label: string) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    push({ type: "success", title: `${label} ${prefs[key] ? "disabled" : "enabled"}` });
  };

  return (
    <SectionCard title="Notification preferences">
      {(
        [
          ["documentIndexed", "Document indexed", "Get notified when a new document finishes indexing."],
          ["documentFailed", "Upload or index failure", "Alert when ingestion fails so you can re-upload."],
          ["mentions", "Tags & mentions", "When you are mentioned in a thread or comment."],
          ["weeklyDigest", "Weekly digest", "A summary of document, question, and system activity."],
          ["productUpdates", "Product updates", "Occasional notes about new SupportPilot features."],
        ] as const
      ).map(([key, label, desc]) => (
        <div key={key} className="settings-row">
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>{label}</div>
            <div className="text-xs text-muted">{desc}</div>
          </div>
          <Switch checked={prefs[key]} onChange={() => togglePref(key, label)} label={label} />
        </div>
      ))}
    </SectionCard>
  );
}

function WorkspaceSection() {
  const { push } = useToast();
  const { user } = useAuth();

  return (
    <>
      <SectionCard title="Workspace">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="text-sm" style={{ fontWeight: 600 }}>Workspace name</div>
            <div className="text-xs text-muted">{user?.email?.split("@")[1] ?? "supportpilot.io"}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => push({ type: "info", title: "Manage workspace", description: "Renaming will be wired to tenant admin APIs." })}>
            <Building2 size={14} /> Manage
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Danger zone">
        <div className="settings-row">
          <div>
            <div className="text-sm" style={{ fontWeight: 600, color: "var(--danger)" }}>Delete workspace</div>
            <div className="text-xs text-muted">Permanently removes all documents, collections, and members.</div>
          </div>
          <Button variant="danger-ghost" size="sm" onClick={() => push({ type: "error", title: "Action blocked", description: "Deletion requires admin confirmation via the backend." })}>
            Delete workspace
          </Button>
        </div>
      </SectionCard>
    </>
  );
}