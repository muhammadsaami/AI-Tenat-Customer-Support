import { Sparkles, Search, ShieldCheck, Zap } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <aside className="auth-panel">
        <div>
          <div className="row" style={{ gap: 12 }}>
            <span
              className="brand-mark"
              style={{
                width: 36,
                height: 36,
                background: "var(--brand-gradient)",
                borderRadius: 11,
                display: "grid",
                placeItems: "center",
                color: "#fff",
              }}
            >
              <Sparkles size={18} />
            </span>
            <span className="brand-name">SupportPilot</span>
          </div>
        </div>
        <div>
          <p className="auth-quote">
            Ask anything. Answer from <span className="grad">your documents</span> — instantly.
          </p>
          <div className="auth-feature-row">
            <div className="auth-feature">
              <Search size={18} />
              <div>
                <b>Grounded answers</b>
                <p>Every reply cites the exact document chunks it was built from.</p>
              </div>
            </div>
            <div className="auth-feature">
              <ShieldCheck size={18} />
              <div>
                <b>Tenant-isolated</b>
                <p>Your data lives in a private, indexed collection. Never shared.</p>
              </div>
            </div>
            <div className="auth-feature">
              <Zap size={18} />
              <div>
                <b>Fast by design</b>
                <p>Postgres + vector store hand-picked for retrieval speed and accuracy.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-sm" style={{ color: "#64748b" }}>
          © {new Date().getFullYear()} SupportPilot — AI Customer Support Platform
        </div>
      </aside>

      <div className="auth-form-col">
        <h1 className="auth-card-title">{title}</h1>
        <p className="auth-card-sub">{subtitle}</p>
        {children}
        <div className="auth-footer">{footer}</div>
      </div>
    </div>
  );
}