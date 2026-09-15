const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith("`") && p.endsWith("`")) {
          return <code key={i} className="rich-code">{p.slice(1, -1)}</code>;
        }
        if (p.startsWith("*") && p.endsWith("*")) {
          return <em key={i}>{p.slice(1, -1)}</em>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} className="rich-line">
          <Inline text={l} />
        </div>
      ))}
    </>
  );
}

export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="rich-text">
      {blocks.map((block, bi) => {
        const trimmed = block.trim();

        if (/^```/.test(trimmed)) {
          return (
            <pre key={bi} className="rich-pre">
              {trimmed.replace(/^```[\w-]*\n?/, "").replace(/\n?```$/, "")}
            </pre>
          );
        }

        const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
          return <Tag key={bi}><Inline text={heading[2]} /></Tag>;
        }

        if (trimmed.startsWith(">")) {
          return (
            <blockquote key={bi} className="rich-quote">
              <Lines lines={trimmed.split("\n").map((l) => l.replace(/^>\s?/, ""))} />
            </blockquote>
          );
        }

        if (/^[-*]\s/.test(trimmed)) {
          return (
            <ul key={bi} className="rich-list">
              {trimmed.split("\n").map((l, i) => (
                <li key={i}><Inline text={l.replace(/^[-*]\s/, "")} /></li>
              ))}
            </ul>
          );
        }

        if (/^\d+[.)]\s/.test(trimmed)) {
          return (
            <ol key={bi} className="rich-list">
              {trimmed.split("\n").map((l, i) => (
                <li key={i}><Inline text={l.replace(/^\d+[.)]\s/, "")} /></li>
              ))}
            </ol>
          );
        }

        return <Lines key={bi} lines={trimmed.split("\n")} />;
      })}
    </div>
  );
}