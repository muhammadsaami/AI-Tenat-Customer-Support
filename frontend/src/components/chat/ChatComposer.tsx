import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

const MAX = 2000;

export function ChatComposer({
  onSend,
  loading,
  placeholder = "Ask a question about your documents…",
  suggestions,
  onSuggestion,
  charCount = true,
  className,
  toolbarStart,
}: {
  onSend: (text: string) => void;
  loading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onSuggestion?: (s: string) => void;
  charCount?: boolean;
  className?: string;
  toolbarStart?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !loading;

  const submit = () => {
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoGrow = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className={`composer${className ? ` ${className}` : ""}`}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={autoGrow}
        onKeyDown={onKeyDown}
        maxLength={MAX}
        aria-label="Message"
        disabled={loading}
      />
      <div className="composer-toolbar">
        {toolbarStart}
        {suggestions && suggestions.length > 0 && (
          <div className="composer-chips">
            {suggestions.map((s) => (
              <button key={s} className="chip" onClick={() => onSuggestion?.(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {charCount && (
            <span className="text-xs" style={{ color: "#64748b" }}>
              {value.length}/{MAX}
            </span>
          )}
          <button
            className="btn btn-primary btn-sm btn-icon"
            style={{ borderRadius: 12 }}
            disabled={!canSend}
            onClick={submit}
            aria-label="Send message"
          >
            {loading ? <ThinkingDots light /> : <ArrowUp size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ThinkingDots({ light }: { light?: boolean }) {
  return (
    <span className={`thinking-dots${light ? "" : ""}`} aria-label="Assistant is thinking">
      <span />
      <span />
      <span />
    </span>
  );
}