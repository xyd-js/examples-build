export type ExampleEntry = {
  slug: string;
  title: string;
  description: string;
  mountedAt: string;
  entryHref: string;
  tags: string[];
  repoUrl: string;
};

export type LandingData = {
  examples: ExampleEntry[];
  featuredSlugs: string[];
  cliVersion: string;
  examplesSha: string;
};
