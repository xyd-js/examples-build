import { MeshGradient } from "@paper-design/shaders-react";
import type { ExampleEntry } from "./types.ts";
import { tagColorClass } from "./tagColor.ts";
import { pickPalette } from "./palettes.ts";

export function Featured({
  items,
  onOpen,
}: {
  items: ExampleEntry[];
  onOpen: (slug: string) => void;
}) {
  return (
    <section style={{ marginTop: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>
        Featured
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {items.map((ex) => (
          <FeaturedCard key={ex.slug} example={ex} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function FeaturedCard({
  example: ex,
  onOpen,
}: {
  example: ExampleEntry;
  onOpen: (slug: string) => void;
}) {
  const colors = pickPalette(ex.slug);
  // Animation speed: 0 = static, 1 = default lib speed. ~0.6 reads as
  // gently moving but not distracting. Bump for more motion.
  const speed = 0.6;
  // Vary distortion/swirl/offset per slug so cards look different.
  const seedNum = stableNumber(ex.slug);
  const distortion = 0.6 + (seedNum % 100) / 250;
  const swirl = 0.4 + ((seedNum >> 5) % 100) / 250;

  return (
    <a
      href={ex.entryHref}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onOpen(ex.slug);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          aspectRatio: "16 / 10",
          borderRadius: 14,
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        <MeshGradient
          colors={colors}
          distortion={distortion}
          swirl={swirl}
          speed={speed}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.95)",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            textShadow: "0 1px 12px rgba(0,0,0,0.18)",
            pointerEvents: "none",
          }}
        >
          {ex.title.charAt(0).toUpperCase()}
        </div>
      </div>
      <div style={{ padding: "0 4px" }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>
          {ex.title}
        </div>
        {ex.tags.length > 0 && (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}
          >
            {ex.tags.slice(0, 3).map((t) => (
              <span key={t} className={`row-tag ${tagColorClass(t)}`}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

function stableNumber(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
