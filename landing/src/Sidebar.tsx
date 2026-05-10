type Props = {
  tags: string[];
  activeTags: string[];
  onToggle: (t: string) => void;
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ tags, activeTags, onToggle, open, onClose }: Props) {
  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      {onClose && (
        <button
          type="button"
          className="sidebar-close"
          aria-label="Close menu"
          onClick={onClose}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 6 18 18" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      )}

      <div className="sidebar-section-title" style={{ marginTop: 0 }}>Topics</div>
      {tags.map((tag) => {
        const isSingleActive =
          activeTags.length === 1 && activeTags[0] === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`sidebar-link${isSingleActive ? " active" : ""}`}
          >
            {tag}
          </button>
        );
      })}

      <div className="sidebar-section-title">Contribute</div>
      <a
        className="sidebar-link contribute"
        href="https://github.com/xyd-js/examples"
        target="_blank"
        rel="noreferrer"
      >
        Examples on GitHub ↗
      </a>
    </aside>
  );
}
