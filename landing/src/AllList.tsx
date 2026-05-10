import type { ExampleEntry } from "./types.ts";
import { tagColorClass } from "./tagColor.ts";
import { FilterDropdown } from "./FilterDropdown.tsx";

type Props = {
  items: ExampleEntry[];
  allTags: string[];
  activeTags: string[];
  onToggleTag: (t: string) => void;
  onOpen: (slug: string) => void;
};

export function AllList({
  items,
  allTags,
  activeTags,
  onToggleTag,
  onOpen,
}: Props) {
  return (
    <section style={{ marginTop: 40 }}>
      <div className="list-header">
        <h2>
          All <span className="count">{items.length}</span>
        </h2>
        <FilterDropdown
          tags={allTags}
          activeTags={activeTags}
          onToggle={onToggleTag}
        />
      </div>

      {items.length === 0 ? (
        <div className="empty">No examples match your filters.</div>
      ) : (
        <div className="rows">
          <div className="rows-head">
            <span className="row-title">Example</span>
            <span className="row-tags">Tags</span>
          </div>
          {items.map((ex) => (
            <a
              key={ex.slug}
              className="row"
              href={ex.entryHref}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                e.preventDefault();
                onOpen(ex.slug);
              }}
            >
              <span className="row-title">{ex.title}</span>
              <span className="row-tags">
                {ex.tags.slice(0, 3).map((t) => (
                  <span key={t} className={`row-tag ${tagColorClass(t)}`}>
                    {t}
                  </span>
                ))}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
