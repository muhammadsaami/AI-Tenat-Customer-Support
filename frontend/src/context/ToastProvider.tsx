import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warn" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

const ToastContext = createContext<{
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}>({
  push: () => "",
  dismiss: () => {},
});

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} color="var(--ok)" />,
  error: <XCircle size={18} color="var(--danger)" />,
  warn: <AlertTriangle size={18} color="var(--warn)" />,
  info: <Info size={18} color="var(--info)" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
      window.setTimeout(() => dismiss(id), 4200);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{ICONS[t.type]}</span>
            <div style={{ minWidth: 0 }}>
              <div className="toast-title">{t.title}</div>
              {t.description && <div className="toast-desc">{t.description}</div>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}