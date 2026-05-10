import type { ExampleEntry } from "./types.ts";

// Shared text + tag filter used by the home list (App.tsx) and the in-viewer
// picker (ExampleViewer.tsx). Anything that lets users find an example by
// typed query goes through here.
export function searchExamples(
  examples: ExampleEntry[],
  query: string,
  activeTags: string[] = [],
): ExampleEntry[] {
  const q = query.trim().toLowerCase();
  return examples.filter((ex) => {
    if (
      activeTags.length > 0 &&
      !activeTags.some((t) => ex.tags.includes(t))
    ) {
      return false;
    }
    if (!q) return true;
    const hay = `${ex.title} ${ex.description} ${ex.tags.join(" ")} ${ex.slug}`.toLowerCase();
    return hay.includes(q);
  });
}
