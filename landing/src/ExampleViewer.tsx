import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import type { ExampleEntry } from "./types.ts";
import { pickPalette } from "./palettes.ts";
import { searchExamples } from "./searchExamples.ts";

const ExamplePicker = memo(function ExamplePicker({
  examples,
  currentSlug,
  open,
  onPick,
}: {
  examples: ExampleEntry[];
  currentSlug: string;
  open: boolean;
  onPick: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset & focus when the picker opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      // Focus after the open transition kicks off so the input scroll-into-view
      // doesn't fight the animation.
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Precompute gradient strings once per `examples` array. Cheap to filter
  // afterwards; we don't recompute the strings.
  const styled = useMemo(
    () =>
      examples.map((ex) => ({
        ex,
        bg: `linear-gradient(135deg, ${pickPalette(ex.slug).join(", ")})`,
      })),
    [examples],
  );

  const visible = useMemo(() => {
    if (!query.trim()) return styled;
    const filtered = searchExamples(examples, query);
    const allowed = new Set(filtered.map((e) => e.slug));
    return styled.filter((s) => allowed.has(s.ex.slug));
  }, [styled, examples, query]);

  return (
    <div
      className="viewer-picker"
      role="listbox"
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
    >
      <div className="viewer-picker-searchwrap">
        <input
          ref={inputRef}
          type="search"
          className="viewer-picker-search"
          placeholder="Search examples"
          aria-label="Search examples"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          tabIndex={open ? 0 : -1}
        />
        {query && (
          <button
            type="button"
            className="viewer-picker-clear"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            title="Clear search"
            tabIndex={open ? 0 : -1}
          >
            <svg
              width="12"
              height="12"
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
      </div>
      {visible.length === 0 ? (
        <div className="viewer-picker-empty">No examples match.</div>
      ) : (
        visible.map(({ ex, bg }) => (
          <button
            key={ex.slug}
            type="button"
            role="option"
            aria-selected={ex.slug === currentSlug}
            tabIndex={open ? 0 : -1}
            className={`viewer-picker-item${
              ex.slug === currentSlug ? " active" : ""
            }`}
            style={{ background: bg }}
            onClick={() => onPick(ex.slug)}
          >
            <span className="viewer-picker-text">{ex.title}</span>
          </button>
        ))
      )}
    </div>
  );
});

type Props = {
  example: ExampleEntry;
  examples: ExampleEntry[];
  initialPath?: string;
  prev?: ExampleEntry | null;
  next?: ExampleEntry | null;
  onSwitch?: (slug: string) => void;
  onClose: () => void;
};

export function ExampleViewer({
  example,
  examples,
  initialPath,
  prev,
  next,
  onSwitch,
  onClose,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const onPick = useCallback(
    (slug: string) => {
      setPickerOpen(false);
      if (slug !== example.slug) onSwitch?.(slug);
    },
    [example.slug, onSwitch],
  );
  // Freeze iframe src at mount — the iframe handles its own navigation
  // afterwards. We only mirror that back into the parent URL.
  const [iframeSrc] = useState(initialPath ?? example.entryHref);
  const [currentPath, setCurrentPath] = useState(
    initialPath ?? example.entryHref,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerOpen) setPickerOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pickerOpen]);

  // Close the picker on outside click. Document `mousedown` covers clicks
  // anywhere in our window; window `blur` covers clicks inside the iframe
  // (those steal focus but don't bubble to our document).
  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (
        labelRef.current &&
        !labelRef.current.contains(e.target as Node)
      ) {
        setPickerOpen(false);
      }
    };
    const onBlur = () => {
      // Defer so we can check what got focus (the iframe is the usual case
      // we want to react to; switching tabs also closes the picker, which
      // is fine).
      setTimeout(() => {
        if (
          document.activeElement &&
          document.activeElement.tagName === "IFRAME"
        ) {
          setPickerOpen(false);
        }
      }, 0);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("blur", onBlur);
    };
  }, [pickerOpen]);

  const onIframeLoad = () => {
    try {
      const w = iframeRef.current?.contentWindow;
      if (!w?.location) return;

      const sync = () => {
        try {
          const path =
            w.location.pathname + w.location.search + w.location.hash;
          setCurrentPath(path);
          // Mirror the in-iframe path into the parent's URL so a hard
          // refresh restores the same view. replaceState avoids polluting
          // history and (importantly) does NOT fire hashchange — so we
          // don't loop back into our own listener.
          if (typeof window !== "undefined") {
            const target = `#${path}`;
            if (window.location.hash !== target) {
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search + target,
              );
            }
          }
        } catch {}
      };

      sync();

      // The example is a client-side-routed React Router app; pushState /
      // replaceState don't fire any standard navigation event. Patch them
      // (only once per iframe document) so we re-sync the URL bar on every
      // SPA navigation.
      type WinHistoryHooked = Window & { __xydUrlHook?: boolean };
      const hooked = (w as unknown as WinHistoryHooked).__xydUrlHook;
      if (!hooked) {
        (w as unknown as WinHistoryHooked).__xydUrlHook = true;
        const h = w.history;
        const origPush = h.pushState;
        const origReplace = h.replaceState;
        h.pushState = function (...args) {
          origPush.apply(this, args as Parameters<typeof origPush>);
          sync();
        };
        h.replaceState = function (...args) {
          origReplace.apply(this, args as Parameters<typeof origReplace>);
          sync();
        };
        w.addEventListener("popstate", sync);
        w.addEventListener("hashchange", sync);
      }
    } catch {
      // cross-origin — never happens with our same-origin examples
    }
  };

  const back = () => {
    try {
      iframeRef.current?.contentWindow?.history.back();
    } catch {}
  };
  const forward = () => {
    try {
      iframeRef.current?.contentWindow?.history.forward();
    } catch {}
  };
  const reload = () => {
    try {
      iframeRef.current?.contentWindow?.location.reload();
    } catch {
      if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
    }
  };
  const toggleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  return (
    <section className="viewer">
      <div className="viewer-frame" ref={wrapperRef}>
        <div className="viewer-bar">
          <div className="viewer-left">
            <a
              href="/"
              className="viewer-logo"
              aria-label="Back to xyd examples"
            >
              <img src="/xyd-logo.svg" alt="xyd" height={14} />
            </a>
            <button
              type="button"
              className="viewer-switch"
              onClick={() => prev && onSwitch?.(prev.slug)}
              disabled={!prev}
              aria-label={
                prev ? `Previous example: ${prev.title}` : "No previous example"
              }
              title={prev ? `← ${prev.title}` : "No previous example"}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="viewer-switch"
              onClick={() => next && onSwitch?.(next.slug)}
              disabled={!next}
              aria-label={
                next ? `Next example: ${next.title}` : "No next example"
              }
              title={next ? `${next.title} →` : "No next example"}
            >
              <ChevronRight />
            </button>
          </div>

          <div className="viewer-toolbar">
            <div className="viewer-history">
              <button
                type="button"
                className="viewer-tool"
                onClick={back}
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="viewer-tool"
                onClick={forward}
                aria-label="Forward"
                title="Forward"
              >
                <ChevronRight />
              </button>
            </div>
            <div className="viewer-label-wrap" ref={labelRef}>
              <button
                type="button"
                className="viewer-label"
                onClick={() => setPickerOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={`Switch example (current: ${example.title})`}
                title={example.title}
              >
                <MeshGradient
                  colors={pickPalette(example.slug)}
                  distortion={0.9}
                  swirl={0.6}
                  speed={0.7}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
                <span className="viewer-label-text">{example.title}</span>
              </button>
              <ExamplePicker
                examples={examples}
                currentSlug={example.slug}
                open={pickerOpen}
                onPick={onPick}
              />
            </div>
            <div className="viewer-url" title={currentPath}>
              {currentPath}
            </div>
            <a
              className="viewer-tool"
              href={example.repoUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
              title="View source on GitHub"
            >
              <GithubMark />
            </a>
            <a
              className="viewer-tool"
              href={currentPath}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in new tab"
              title="Open in new tab"
            >
              <ExternalLink />
            </a>
            <button
              type="button"
              className="viewer-tool"
              onClick={reload}
              aria-label="Reload"
              title="Reload"
            >
              <RefreshIcon />
            </button>
          </div>

          <div className="viewer-right">
            <button
              type="button"
              className="viewer-fullscreen"
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              title="Fullscreen"
            >
              <Maximize />
            </button>
            <button
              type="button"
              className="viewer-close"
              onClick={onClose}
              aria-label="Close (Esc)"
              title="Close (Esc)"
            >
              <Close />
            </button>
          </div>
        </div>

        <iframe
          ref={iframeRef}
          className="viewer-iframe"
          src={iframeSrc}
          title={example.title}
          onLoad={onIframeLoad}
        />
      </div>
    </section>
  );
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
);
const ExternalLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </svg>
);
const Maximize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9V4h5" />
    <path d="M20 9V4h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 15v5h-5" />
  </svg>
);
const GithubMark = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.07c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38s1.95.13 2.86.38c2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.66.8.55 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.65 18.35.5 12 .5Z" />
  </svg>
);
const Close = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </svg>
);
