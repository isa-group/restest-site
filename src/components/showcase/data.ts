// What scripts/sync-showcase.mjs writes for the showcase and the first page's band: the published campaigns,
// the newest first. A build that did not run it, such as one from `npm run sync && npx astro build`, has none,
// and so no showcase and no band.

/** An API's row: its figures when RESTest left a report, else what became of it and why. */
export interface ShowcaseRow {
  id: string;
  title: string;
  outcome: 'ran' | 'apiDidNotStart' | 'imagesNotPulled' | 'noReport';
  reason: string | null;
  operations?: number;
  requests?: number;
  errors?: number;
  warnings?: number;
  withErrors?: number;
  onlyWarnings?: number;
  nothing?: number;
  notTested?: number;
  /** Its report.html: served by the site for the newest campaign, else downloaded from the release. */
  page: { href: string; here: boolean } | null;
}

export interface Campaign {
  version: string;
  release: string;
  date: string;
  minutes: number | null;
  runner: { label: string; cpus: number; memoryGiB: number | null } | null;
  apis: ShowcaseRow[];
  totals: { apis: number; requests: number; errors: number; warnings: number; apisWithErrors: number };
  mostErrors: string[];
}

const written = import.meta.glob<{ campaigns: Campaign[] }>('../../generated/showcase.json', {
  eager: true,
  import: 'default',
});

/** The published campaigns, the newest first; none when the build did not read them. */
export const campaigns: Campaign[] = Object.values(written)[0]?.campaigns ?? [];

/** The showcase's address for a campaign: the newest at /showcase/, each other at /showcase/<version>/. */
export const showcasePath = (campaign: Campaign) =>
  campaign === campaigns[0] ? 'showcase/' : `showcase/${campaign.version}/`;

/** What became of an API that left no report, in a few words. */
export const outcomes: Record<string, string> = {
  apiDidNotStart: 'did not start',
  imagesNotPulled: 'its images could not be pulled',
  noReport: 'RESTest left no report',
};

/** The day a campaign started, as the site writes dates: 8 November 2026. */
export const day = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
