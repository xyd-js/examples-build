import { useRef } from "react";

type Props = {
  query: string;
  onQuery: (s: string) => void;
  popularTags: string[];
  activeTags: string[];
  onToggleTag: (t: string) => void;
};

export function Hero({
  query,
  onQuery,
  popularTags,
  activeTags,
  onToggleTag,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="hero">
      <h1>xyd examples</h1>
      <p>Recipes and starter sites built with xyd.</p>
      <label className="search">
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
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search examples"
          aria-label="Search examples"
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              onQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            title="Clear search"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6 18 18" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        )}
      </label>
      <div className="popular-tags">
        {popularTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`popular-tag${activeTags.includes(tag) ? " active" : ""}`}
            onClick={() => onToggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </section>
  );
}
