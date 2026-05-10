type NavItem = {
  label: string;
  href: string;
  active?: boolean;
  external?: boolean;
};

const NAV: NavItem[] = [
  { label: "Home", href: "/", active: true },
  { label: "Docs", href: "https://xyd.dev/docs", external: true },
  { label: "Website", href: "https://xyd.dev", external: true },
];

const GITHUB_URL = "https://github.com/xyd-js/examples";

export function Header({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="topnav">
      <a href="/" className="topnav-brand" aria-label="xyd examples">
        <img src="/xyd-logo.svg" alt="xyd" height={18} />
        <span className="topnav-brand-suffix">examples</span>
      </a>

      <nav className="topnav-center" aria-label="Primary">
        {NAV.map((n) => (
          <a
            key={n.label}
            href={n.href}
            className={`topnav-link${n.active ? " active" : ""}`}
            {...(n.external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {n.label}
          </a>
        ))}
      </nav>

      <div className="topnav-right">
        <a
          className="topnav-cta"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.07c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38s1.95.13 2.86.38c2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.66.8.55 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
          GitHub
        </a>
        <button
          type="button"
          className="topnav-toggle"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? (
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
          ) : (
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
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
