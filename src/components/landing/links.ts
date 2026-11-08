// What the site's own pages link: pages of the documentation, looked up among the pages built — the build stops,
// naming one, if this version of the documentation does not have it, since RESTest could rename a chapter —
// and the showcase, when a campaign is published.

import { getCollection } from 'astro:content';
import { showcaseHome } from '../showcase/data';

export interface SiteLinks {
  docs: string;
  reference: string;
  start: string;
  manual: string;
  agents: string | null;
  plans: string;
  dictionaries: string;
  settings: string;
  showcase: string | null;
}

/** The links. The page for coding agents, which RESTest has from 2.5.0 on, is null in a version that does not
 * have it, and the showcase before a campaign is published. */
export async function siteLinks(): Promise<SiteLinks> {
  const base = import.meta.env.BASE_URL;
  const pages = new Set((await getCollection('docs')).map((page) => page.id));
  const page = (id: string) => {
    if (!pages.has(id)) throw new Error(`The site links /${id}/, which the documentation of this version does not have`);
    return `${base}${id}/`;
  };
  return {
    docs: page('docs'),
    reference: page('docs/command-line'),
    start: page('docs/manual/a-first-run'),
    manual: page('docs/manual'),
    agents: pages.has('docs/for-coding-agents') ? page('docs/for-coding-agents') : null,
    plans: page('docs/manual/plans'),
    dictionaries: page('docs/manual/dictionaries'),
    settings: page('docs/manual/settings'),
    showcase: showcaseHome,
  };
}
