// Hand-curated metadata for examples-build.
// Future: tags will move into each example's docs.json (in xyd-js/examples).
// For now keep them here so we can iterate without touching that repo.

export const popularTags: string[] = [
  "OpenAPI",
  "GraphQL",
  "Auth",
  "MCP",
  "React",
  "Internationalization",
];

// slug → tags. Slugs missing from this map render with no tags.
export const tagsBySlug: Record<string, string[]> = {
  abtesting: ["A/B testing", "GrowthBook"],
  "access-control-edge-custom-page-ui": ["Auth", "Edge"],
  "access-control-edge-jwt": ["Auth", "JWT", "Edge"],
  "access-control-edge-oauth": ["Auth", "OAuth", "Edge"],
  "access-control-edge-password": ["Auth", "Edge"],
  "access-control-jwt": ["Auth", "JWT"],
  "access-control-oauth": ["Auth", "OAuth"],
  "ask-ai": ["AI"],
  basename: ["Routing"],
  "custom-icons": ["Theming"],
  "custom-js": ["Theming"],
  graphql: ["GraphQL", "API"],
  graphviz: ["Diagrams"],
  i18n: ["Internationalization"],
  "i18n-catalog-overrides": ["Internationalization", "Catalogs", "Overrides"],
  "i18n-catalogs": ["Internationalization", "Catalogs"],
  "i18n-catalogs-custom-paths": ["Internationalization", "Catalogs"],
  "i18n-overrides": ["Internationalization", "Overrides"],
  "i18n-overrides-flat": ["Internationalization", "Overrides"],
  mcp: ["MCP", "AI"],
  "monday-clone": ["GraphQL", "Showcase"],
  "openai-clone": ["OpenAPI", "Showcase"],
  openapi: ["OpenAPI", "API"],
  "react-components": ["React"],
  syntaxhighlight: ["Theming"],
  "vite-custom-configuration": ["Vite"],
};

// Pinned-first featured slots. Slugs listed here always appear at the top of
// the featured list (in order); the remaining slots are auto-filled with the
// most-recently-touched examples in the examples repo.
export const featuredOverride: string[] = ["i18n"];

export const featuredCount = 6;
