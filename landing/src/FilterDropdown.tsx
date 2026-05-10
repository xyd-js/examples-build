import { useEffect, useRef, useState } from "react";
import { tagColorClass } from "./tagColor.ts";

type Props = {
  tags: string[];
  activeTags: string[];
  onToggle: (t: string) => void;
};

export function FilterDropdown({ tags, activeTags, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const visible = tags.filter((t) =>
    t.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="filter-wrap" ref={wrapRef}>
      <button
        type="button"
        className="filter-button"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 4h18l-7 9v6l-4 2v-8z" />
        </svg>
        Filter
        {activeTags.length > 0 && (
          <span style={{ marginLeft: 4, color: "var(--fg-muted)" }}>
            ({activeTags.length})
          </span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "transform 0.15s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="filter-popover" role="listbox">
          <input
            className="filter-search"
            placeholder="Search tags..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {visible.length === 0 && (
            <div style={{ padding: 12, color: "var(--fg-faint)", fontSize: 13 }}>
              No tags match
            </div>
          )}
          {visible.map((t) => {
            const active = activeTags.includes(t);
            return (
              <button
                key={t}
                type="button"
                className={`filter-option${active ? " active" : ""} ${tagColorClass(t)}`}
                onClick={() => onToggle(t)}
                role="option"
                aria-selected={active}
              >
                <span className={`row-tag ${tagColorClass(t)}`}>{t}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
