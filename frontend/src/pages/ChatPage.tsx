import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Sparkles,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Check,
  PanelRight,
  BookOpen,
  FileText,
  Library,
  ArrowUpRight,
  ArrowRightLeft,
  Layers,
  Compass,
  PenLine,
  Paperclip,
  Globe,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ChatComposer, ThinkingDots } from "@/components/chat/ChatComposer";
import { SourceCard } from "@/components/chat/SourceCard";
import { RichText } from "@/components/chat/RichText";
import { chatSeeds } from "@/services/mock/data";
import { services } from "@/services/service";
import { isMockMode } from "@/services/api/client";
import { useToast } from "@/context/ToastProvider";
import { useDocuments } from "@/hooks/useDocuments";
import { errorMessage } from "@/lib/errors";
import { timeAgo, uid } from "@/lib/util";
import type { ChatResponse, ChatSource } from "@/types/api";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  createdAt: string;
  error?: boolean;
}

const DEMO_SUGGESTIONS = [
  "What is Muhammad Sami's AI background?",
  "Summarize the onboarding handbook",
  "What does the support FAQ cover?",
];

const LIVE_SUGGESTIONS = [
  "Summarize my most recent document",
  "What topics are covered in my knowledge base?",
  "What do my documents say about customer returns?",
];

const SUGGESTION_ICONS = [FileText, Library, MessageSquare];

interface Mode {
  id: string;
  label: string;
  icon: LucideIcon;
  placeholder: string;
}

const MODES: Mode[] = [
  { id: "ask", label: "Ask Anything", icon: Sparkles, placeholder: "Ask anything about your documents…" },
  { id: "summarize", label: "Summarize", icon: Layers, placeholder: "What would you like summarized from your knowledge base?" },
  { id: "compare", label: "Compare", icon: ArrowRightLeft, placeholder: "What would you like to compare against your documents?" },
  { id: "insights", label: "Find Insights", icon: Compass, placeholder: "What patterns or insights should I look for?" },
  { id: "draft", label: "Draft Content", icon: PenLine, placeholder: "What content should I draft from your knowledge base?" },
];

function toQuestion(modeId: string, text: string): string {
  switch (modeId) {
    case "summarize":
      return `Summarize the key points about this topic from my knowledge base: ${text}`;
    case "compare":
      return `Compare these items from my knowledge base: ${text}`;
    case "insights":
      return `Find insights and patterns in my knowledge base related to: ${text}`;
    case "draft":
      return `Draft content using my knowledge base on the topic: ${text}`;
    default:
      return text;
  }
}

export function ChatPage() {
  const demo = isMockMode();
  const [threads] = useState(chatSeeds);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth > 1080);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regenerate, setRegenerate] = useState(false);
  const [mode, setMode] = useState<string>("ask");
  const [docMenu, setDocMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();
  const { docs } = useDocuments();

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const suggestions = (demo ? DEMO_SUGGESTIONS : LIVE_SUGGESTIONS).map((q, i) => ({
    q,
    icon: SUGGESTION_ICONS[i % SUGGESTION_ICONS.length],
  }));

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const addAssistant = (content: string, sources?: ChatSource[], error = false) => {
    setMessages((prev) => [
      ...prev,
      { id: uid("m"), role: "assistant", content, sources, createdAt: new Date().toISOString(), error },
    ]);
  };

  const send = async (text: string) => {
    const userMsg: Msg = {
      id: uid("m"),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setRegenerate(false);
    try {
      const res: ChatResponse = await services.chat.send({ question: toQuestion(mode, text) });
      addAssistant(res.answer, res.sources);
    } catch (err) {
      const msg = errorMessage(err, "The assistant could not answer right now.");
      addAssistant(msg, undefined, true);
    } finally {
      setLoading(false);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.error);
  const empty = messages.length === 0 && !loading;

  const doRegenerate = async () => {
    const last = [...messages].reverse().find((m) => m.role === "user");
    if (!last) return;
    setRegenerate(true);
    const target = lastAssistant;
    if (target) setMessages((prev) => prev.filter((m) => m.id !== target.id));
    try {
      const res = await services.chat.send({ question: toQuestion(mode, last.content) });
      addAssistant(res.answer, res.sources);
    } catch (err) {
      addAssistant(errorMessage(err, "The assistant could not answer right now."), undefined, true);
    } finally {
      setRegenerate(false);
    }
  };

  const copy = async (msg: Msg) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      push({ type: "error", title: "Copy failed", description: "Clipboard is unavailable in this context." });
    }
  };

  const startFromThread = (question: string, createdAt: string) => {
    setMessages([{ id: uid("m"), role: "user", content: question, createdAt }]);
    void send(question);
  };

  const openSources = () => setShowSources(true);

  const notWired = (what: string, note: string) =>
    push({ type: "info", title: `${what} isn't wired yet`, description: note });

  return (
    <div className="container-page chat-page">
      <section className="hero chat-hero anim-rise">
        <span className="chat-hero-glow chat-hero-glow-a" />
        <span className="chat-hero-glow chat-hero-glow-b" />
        <div className="chat-hero-inner">
          <div className="chat-hero-copy">
            <span className="badge chat-hero-badge"><Sparkles size={12} /> AI at Work</span>
            <h2>Ask your <span className="accent">knowledge.</span></h2>
            <p>Get accurate answers grounded in your documents.</p>
          </div>
          <div className="chat-hero-visual" aria-hidden="true">
            <span className="hv-doc hv-doc-1"><FileText size={18} /></span>
            <span className="hv-doc hv-doc-2"><BookOpen size={18} /></span>
            <span className="hv-doc hv-doc-3"><MessageSquare size={18} /></span>
            <span className="hv-core-wrap">
              <span className="hv-core"><Sparkles size={26} /></span>
            </span>
          </div>
        </div>
      </section>

      <section className="chat-workspace anim-rise">
        <div className="workspace-topbar">
          <div className="row" style={{ gap: 10 }}>
            <span className="wb-icon"><BookOpen size={15} /></span>
            <span className="text-sm" style={{ fontWeight: 700 }}>Workspace chat</span>
            <Badge tone="info" dot>Grounded answers</Badge>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSources((v) => !v)}>
            <PanelRight size={15} />
            {showSources ? "Hide" : "Show"} sources
            {lastAssistant?.sources && lastAssistant.sources.length > 0 && (
              <span className="wb-count">{lastAssistant.sources.length}</span>
            )}
          </button>
        </div>

        <div className={`chat-layout${showSources ? "" : " no-sources"}`}>
          <div className="chat-col">
            <div className="chat-scroll" ref={scrollRef}>
              {empty ? (
                <div className="chat-empty">
                  <div className="chat-empty-visual" aria-hidden="true">
                    <span className="cev-chip c1"><FileText size={16} /></span>
                    <span className="cev-chip c2"><BookOpen size={16} /></span>
                    <span className="cev-ring" />
                    <span className="cev-orb-wrap"><span className="cev-orb"><Sparkles size={24} /></span></span>
                  </div>
                  <h2>Ask your knowledge</h2>
                  <p>
                    Questions are answered from your uploaded documents — every response cites the
                    chunks it was built from.
                  </p>
                  {demo && (
                    <div className="chat-threads">
                      {threads.map((t) => (
                        <button
                          key={t.id}
                          className="row"
                          style={{ width: "100%", border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", gap: 12, textAlign: "left", boxShadow: "var(--shadow-sm)" }}
                          onClick={() => startFromThread(threadQuestion(t), t.updatedAt)}
                        >
                          <span className="src-doc-icon"><BookOpen size={16} /></span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="text-sm" style={{ fontWeight: 600, display: "block" }}>{t.title}</span>
                            <span className="text-xs text-muted text-truncate" style={{ display: "block" }}>{t.preview}</span>
                          </span>
                          <span className="text-xs text-muted shrink-0">{timeAgo(t.updatedAt)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="stack" style={{ "--gap": "0px" } as React.CSSProperties}>
                  {messages.map((m) => (
                    <div key={m.id} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"} anim-message`}>
                      {m.role === "assistant" && (
                        <span className="msg-avatar"><Sparkles size={15} /></span>
                      )}
                      <div className="msg-body">
                        <div className={`msg-bubble${m.error ? " msg-error" : ""}`}>
                          {m.role === "assistant" && !m.error ? (
                            <RichText text={m.content} />
                          ) : (
                            <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
                          )}
                          {m.role === "assistant" && !m.error && m.sources && m.sources.length > 0 && (
                            <div className="msg-citations">
                              {m.sources.map((s, i) => (
                                <button key={i} className="cit" onClick={openSources} aria-label={`Open source ${i + 1}`}>
                                  <span className="cit-num">{i + 1}</span>
                                  <span className="cit-name text-truncate">{s.filename}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {m.role === "assistant" && !m.error && m.sources && m.sources.length > 0 && (
                          <button className="msg-sources-pill" onClick={openSources} aria-label={`Show ${m.sources.length} grounding sources`}>
                            <BookOpen size={13} /> Grounded on {m.sources.length} source{m.sources.length > 1 ? "s" : ""}
                          </button>
                        )}
                        <div className="msg-actions">
                          {m.role === "assistant" && !m.error && (
                            <>
                              <button className="msg-action" onClick={() => void doRegenerate()} disabled={regenerate} aria-label="Regenerate">
                                <RefreshCw size={14} className={regenerate ? "spinner" : ""} style={regenerate ? { width: 13, height: 13 } : undefined} />
                              </button>
                              <button className="msg-action" onClick={() => push({ type: "success", title: "Feedback recorded", description: "Thanks — this helps us improve grounded answers." })} aria-label="Helpful">
                                <ThumbsUp size={14} />
                              </button>
                              <button className="msg-action" onClick={() => push({ type: "info", title: "Feedback recorded", description: "The team will review this answer." })} aria-label="Not helpful">
                                <ThumbsDown size={14} />
                              </button>
                            </>
                          )}
                          <button className="msg-action" onClick={() => void copy(m)} aria-label="Copy">
                            {copiedId === m.id ? <Check size={14} color="var(--ok)" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="msg-time">{timeAgo(m.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="msg msg-assistant anim-message">
                      <span className="msg-avatar"><Sparkles size={15} /></span>
                      <div className="msg-bubble msg-loading">
                        <div className="loading-row">
                          <ThinkingDots light />
                          <span className="loading-label">Retrieving the most relevant chunks…</span>
                        </div>
                        <div className="loading-progress" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="chat-composer-area">
              {empty && (
                <div className="suggest-row anim-rise">
                  {suggestions.map((s, i) => (
                    <button key={i} className="suggest-card" style={{ animationDelay: `${i * 60}ms` }} onClick={() => void send(s.q)}>
                      <span className="suggest-icon"><s.icon size={15} /></span>
                      <span className="suggest-title">{s.q}</span>
                      <ArrowUpRight className="suggest-arrow" size={16} />
                    </button>
                  ))}
                </div>
              )}

              <div className="mode-row">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    className={`mode-chip${mode === m.id ? " active" : ""}`}
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                  >
                    <m.icon size={13} />
                    {m.label}
                  </button>
                ))}
              </div>

              <ChatComposer
                onSend={(t) => void send(t)}
                loading={loading}
                className="composer-light"
                placeholder={activeMode.placeholder}
                charCount={false}
                toolbarStart={
                  <div className="composer-tools">
                    <button
                      className="ctool"
                      title="Attach files (not yet supported)"
                      aria-label="Attach files"
                      onClick={() => notWired("File attachments", "Attachments aren't supported yet — ask questions about your uploaded PDFs instead.")}
                    >
                      <Paperclip size={16} />
                    </button>
                    <div className="ctool-doc">
                      <button
                        className="ctool"
                        onClick={() => setDocMenu((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={docMenu}
                      >
                        <Library size={16} />
                        <span className="text-truncate" style={{ maxWidth: 120 }}>All documents</span>
                        <ChevronDown size={14} />
                      </button>
                      {docMenu && (
                        <div className="doc-menu" role="menu" aria-label="Document scope">
                          <div className="doc-menu-head">Context</div>
                          <button className="doc-menu-item sel" role="menuitem" onClick={() => setDocMenu(false)}>
                            <Library size={14} /> All documents
                          </button>
                          <div className="doc-menu-head">Uploaded</div>
                          {docs.length === 0 && (
                            <div className="doc-menu-empty">No documents uploaded yet</div>
                          )}
                          {docs.map((d) => (
                            <button
                              key={d.id}
                              className="doc-menu-item"
                              role="menuitem"
                              onClick={() => {
                                setDocMenu(false);
                                notWired("Per-document filtering", "Questions currently search the whole workspace — per-document scoping will follow the backend API.");
                              }}
                            >
                              <FileText size={14} />
                              <span className="text-truncate">{d.filename}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="ctool"
                      title="Web search (not yet supported)"
                      aria-label="Web search"
                      onClick={() => notWired("Web search", "Answers are grounded on your uploaded documents only — web search will arrive with the backend integration.")}
                    >
                      <Globe size={16} />
                      <span>Web</span>
                      <span className="tgl"><span /></span>
                    </button>
                  </div>
                }
              />

              <div className="composer-note">
                <kbd>Enter</kbd> to send
                <span>·</span>
                <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
                <span>·</span>
                <span>answers are grounded on your indexed documents</span>
              </div>
            </div>
          </div>

          {showSources && (
            <>
              <div className="sources-backdrop" onClick={() => setShowSources(false)} />
              <aside className={`sources-panel${showSources ? " open" : ""}`}>
                <div className="panel sources-panel-card">
                  <div className="sources-head">
                    <div className="sources-title-wrap">
                      <span className="sources-icon"><BookOpen size={17} /></span>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="sources-title">Sources</h3>
                        <p className="sources-sub">Grounding excerpts from your knowledge base</p>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Badge tone="primary">{lastAssistant?.sources?.length ?? 0}</Badge>
                      <button className="sources-close" onClick={() => setShowSources(false)} aria-label="Close sources">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {lastAssistant?.sources?.length ? (
                    <div className="sources-list">
                      {lastAssistant.sources.map((s, i) => (
                        <SourceCard key={`${s.doc_id}-${i}`} source={s} rank={i} expandable />
                      ))}
                    </div>
                  ) : (
                    <div className="sources-empty">
                      <span className="sources-empty-icon"><BookOpen size={16} /></span>
                      <p>Ask a question to see the document chunks that grounded the answer — filename, chunk position, distance, and excerpt.</p>
                    </div>
                  )}
                </div>
              </aside>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function threadQuestion(t: (typeof chatSeeds)[number]): string {
  if (t.title.includes("background")) return "What is Muhammad Sami's AI background?";
  if (t.title.includes("handbook")) return "Summarize the onboarding handbook";
  return "What does the support FAQ cover?";
}