// Hand-curated metadata for examples-build.
// Future: tags will move into each example's docs.json (in xyd-js/examples).
// For now keep them here so we can iterate without touching that repo.

export const popularTags: string[] = [
  "OpenAPI",
  "GraphQL",
  "Auth",
  "MCP",
  "React",
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
  mcp: ["MCP", "AI"],
  "monday-clone": ["GraphQL", "Showcase"],
  "openai-clone": ["OpenAPI", "Showcase"],
  openapi: ["OpenAPI", "API"],
  "react-components": ["React"],
  syntaxhighlight: ["Theming"],
  "vite-custom-configuration": ["Vite"],
};

// Optional. Empty = auto-pick most recently touched examples in git.
export const featuredOverride: string[] = [];

export const featuredCount = 6;
