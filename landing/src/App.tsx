import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header.tsx";
import { Hero } from "./Hero.tsx";
import { Sidebar } from "./Sidebar.tsx";
import { Featured } from "./Featured.tsx";
import { AllList } from "./AllList.tsx";
import { ExampleViewer } from "./ExampleViewer.tsx";
import { popularTags } from "./data/curated.ts";
import { searchExamples } from "./searchExamples.ts";
import type { LandingData } from "./types.ts";

// Parent URL is "https://.../#<iframe-path>". When an example is open, the
// iframe's full path is mirrored here so a hard refresh restores the same
// in-iframe view.
function readHashPath(): string | null {
  if (typeof location === "undefined") return null;
  const h = location.hash;
  if (!h.startsWith("#/")) return null;
  try {
    return decodeURI(h.slice(1));
  } catch {
    return h.slice(1);
  }
}

export function App({ data }: { data: LandingData }) {
  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(() => readHashPath());

  useEffect(() => {
    const onHash = () => setOpenPath(readHashPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const openExample = (slug: string) => {
    const ex = data.examples.find((e) => e.slug === slug);
    const target = ex ? ex.entryHref : `/${slug}`;
    location.hash = `#${target}`;
  };
  const closeExample = () => {
    history.pushState("", document.title, location.pathname + location.search);
    setOpenPath(null);
  };

  const setQueryAndCloseExample = (q: string) => {
    if (openPath && q) closeExample();
    setQuery(q);
  };

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Disable transitions while the window is resizing — otherwise crossing
  // the mobile breakpoint causes the sidebar to visibly slide out/in.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      document.documentElement.classList.add("no-anim");
      if (timer) clearTimeout(timer);
      timer = setTimeout(
        () => document.documentElement.classList.remove("no-anim"),
        120,
      );
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const ex of data.examples) for (const t of ex.tags) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data.examples]);

  const filtered = useMemo(
    () => searchExamples(data.examples, query, activeTags),
    [data.examples, query, activeTags],
  );

  // Sidebar + Hero: single-select. Click replaces, click-same clears.
  const toggleTag = (tag: string) => {
    if (openPath) closeExample();
    setActiveTags((prev) =>
      prev.length === 1 && prev[0] === tag ? [] : [tag],
    );
  };
  // Filter dropdown: multi-select. Toggles tag in/out of the set.
  const toggleTagMulti = (tag: string) => {
    if (openPath) closeExample();
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const featured = useMemo(() => {
    const order = new Map(data.examples.map((e, i) => [e.slug, i]));
    return [...data.examples]
      .filter((e) => data.featuredSlugs.includes(e.slug))
      .sort((a, b) => {
        const ai = data.featuredSlugs.indexOf(a.slug);
        const bi = data.featuredSlugs.indexOf(b.slug);
        return ai - bi || (order.get(a.slug)! - order.get(b.slug)!);
      });
  }, [data.examples, data.featuredSlugs]);

  // Resolve the open example by matching the first path segment of the
  // hash against each example's mountedAt (e.g. /my-base → basename).
  const openExampleEntry = useMemo(() => {
    if (!openPath) return null;
    const seg = openPath.split("/")[1];
    if (!seg) return null;
    return (
      data.examples.find((e) => e.mountedAt === `/${seg}`) ??
      data.examples.find((e) => e.slug === seg) ??
      null
    );
  }, [openPath, data.examples]);

  // Prev / next example for the viewer. Respect the current filter when
  // the open example is part of it; otherwise fall back to the full list.
  const prevNext = useMemo(() => {
    if (!openExampleEntry) return { prev: null, next: null };
    const list = filtered.some((e) => e.slug === openExampleEntry.slug)
      ? filtered
      : data.examples;
    const i = list.findIndex((e) => e.slug === openExampleEntry.slug);
    return {
      prev: i > 0 ? list[i - 1] : null,
      next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
    };
  }, [openExampleEntry, filtered, data.examples]);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleAndClose = (t: string) => {
    toggleTag(t);
    closeSidebar();
  };

  return (
    <div className="shell">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="page">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
      )}
      <Sidebar
        tags={allTags}
        activeTags={activeTags}
        onToggle={toggleAndClose}
        open={sidebarOpen}
        onClose={closeSidebar}
      />
      {openExampleEntry ? (
        <ExampleViewer
          key={openExampleEntry.slug}
          example={openExampleEntry}
          examples={data.examples}
          initialPath={openPath ?? openExampleEntry.entryHref}
          prev={prevNext.prev}
          next={prevNext.next}
          onSwitch={openExample}
          onClose={closeExample}
        />
      ) : (
        <main className="main">
          <Hero
            query={query}
            onQuery={setQueryAndCloseExample}
            popularTags={popularTags}
            activeTags={activeTags}
            onToggleTag={toggleTag}
          />
          {!query && activeTags.length === 0 && featured.length > 0 && (
            <Featured items={featured} onOpen={openExample} />
          )}
          <AllList
            items={filtered}
            allTags={allTags}
            activeTags={activeTags}
            onToggleTag={toggleTagMulti}
            onOpen={openExample}
          />
          <footer className="footer">
            xyd-js/cli@{data.cliVersion} · examples@{data.examplesSha.slice(0, 7)}
          </footer>
        </main>
      )}
      </div>
    </div>
  );
}
