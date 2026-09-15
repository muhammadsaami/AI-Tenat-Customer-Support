import { useEffect, useRef, useState } from "react";

export interface MenuItemProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export function Menu({
  trigger,
  items,
  align = "right",
}: {
  trigger: (props: { toggle: () => void; open: boolean }) => React.ReactNode;
  items: (MenuItemProps | "separator")[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className="menu-anchor" ref={ref}>
      {trigger({ toggle, open })}
      {open && (
        <div className="menu-pop" role="menu" style={align === "left" ? { left: 0, right: "auto" } : undefined}>
          {items.map((item, i) =>
            item === "separator" ? (
              <div className="menu-sep" key={i} />
            ) : (
              <button
                key={i}
                role="menuitem"
                className={`menu-item${item.danger ? " danger" : ""}`}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}