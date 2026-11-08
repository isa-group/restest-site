// The pages of the documentation the site's own pages link, looked up among the pages built: the build stops,
// naming one, if this version of the documentation does not have it, since RESTest could rename a chapter.

import { getCollection } from 'astro:content';

export interface SiteLinks {
  docs: string;
  reference: string;
  start: string;
  manual: string;
  agents: string | null;
  plans: string;
  dictionaries: string;
  settings: string;
}

/** The links, for the page named `from` (in the message when one is missing). The page for coding agents,
 * which RESTest has from 2.5.0 on, is null in a version that does not have it. */
export async function siteLinks(from: string): Promise<SiteLinks> {
  const base = import.meta.env.BASE_URL;
  const pages = new Set((await getCollection('docs')).map((page) => page.id));
  const page = (id: string) => {
    if (!pages.has(id)) throw new Error(`${from} links /${id}/, which the documentation of this version does not have`);
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
  };
}
