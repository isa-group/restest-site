// The site's sidebar, read from the two indexes of RESTest's documentation.

import { EXIT, visit } from 'unist-util-visit';
import { DocumentationError, parse, plainText } from './markdown.mjs';

export const DOCS_INDEX = 'docs/README.md';
export const MANUAL_INDEX = 'docs/manual/README.md';

/** Pages that need no entry: the two indexes themselves, the README, which `docs/README.md` opens with,
 * and the decision records, which their own index lists. */
const UNLISTED = (path) => path === DOCS_INDEX || path === MANUAL_INDEX || path === 'README.md' || path.startsWith('docs/adr/');

/**
 * The chapters of the manual: the numbered list of `docs/manual/README.md`, in its order and numbered by
 * it. Each item's first link gives the chapter and its label, and the words after the dash its
 * description: `1. [What RESTest is for](01-what-restest-is-for.md) — the problem it solves` .
 */
export function readManual(markdown) {
  const list = parse(markdown).children.find((node) => node.type === 'list' && node.ordered);
  if (!list) throw new DocumentationError(MANUAL_INDEX, 'has no numbered list of chapters');
  return list.children.map((item, i) => {
    const paragraph = item.children.find((node) => node.type === 'paragraph');
    const at = paragraph?.children.findIndex((node) => node.type === 'link') ?? -1;
    if (at < 0) throw new DocumentationError(MANUAL_INDEX, `chapter ${i + 1} of its list has no link`);
    const link = paragraph.children[at];
    const rest = plainText(paragraph.children.slice(at + 1));
    return {
      url: link.url,
      label: plainText(link).trim(),
      description: rest.replace(/^\s*[—–-]\s*/, '').trim(),
      chapter: (list.start ?? 1) + i,
    };
  });
}

/**
 * The sections of `docs/README.md`: one per `##` heading, named by it, with an entry per row of the table
 * under it. A row's first cell links the page and labels it; its second describes it.
 */
export function readSections(markdown) {
  const sections = [];
  for (const node of parse(markdown).children) {
    if (node.type === 'heading' && node.depth === 2) {
      sections.push({ label: plainText(node).trim(), entries: null });
    } else if (node.type === 'table' && sections.length) {
      const section = sections.at(-1);
      section.entries ??= [];
      for (const row of node.children.slice(1)) {
        const [first, second] = row.children;
        const link = findLink(first);
        if (!link) throw new DocumentationError(DOCS_INDEX, `a row of "${section.label}" links no page`);
        section.entries.push({
          url: link.url,
          label: plainText(link).trim(),
          description: second ? plainText(second).trim() : '',
        });
      }
    }
  }
  if (!sections.length) throw new DocumentationError(DOCS_INDEX, 'has no section, a heading starting with `## `');
  for (const section of sections) {
    if (!section.entries) throw new DocumentationError(DOCS_INDEX, `section "${section.label}" has no table of pages`);
    if (!section.entries.length) throw new DocumentationError(DOCS_INDEX, `section "${section.label}" lists no page`);
  }
  return sections;
}

/**
 * The outline of the documentation: the overview, the manual's chapters, then the sections of
 * `docs/README.md`, each entry with the page it leads to, found by `resolve` as a link on that index
 * would be. Fails when an entry leads to no page, or when a page that needs an entry has none, naming
 * them: a page missing from the indexes would be on the site with no way to it from the sidebar.
 */
export function buildOutline({ manual, sections, slugs, resolve }) {
  const entry = (from) => (item) => {
    const path = resolve(from, item.url)?.page;
    if (!path) throw new DocumentationError(from, `lists ${item.url}, which is not a page of the documentation`);
    return { ...item, path, slug: slugs.get(path) };
  };
  const outline = {
    overview: { path: DOCS_INDEX, slug: slugs.get(DOCS_INDEX), label: 'Overview' },
    groups: [
      { label: 'Manual', entries: manual.map(entry(MANUAL_INDEX)) },
      ...sections.map((section) => ({ label: section.label, entries: section.entries.map(entry(DOCS_INDEX)) })),
    ],
  };
  const listed = new Set(outline.groups.flatMap((group) => group.entries.map((e) => e.path)));
  const missing = [...slugs.keys()].filter((path) => !listed.has(path) && !UNLISTED(path));
  if (missing.length) {
    throw new DocumentationError(DOCS_INDEX, `lists no entry for ${missing.join(', ')}; every page needs one, in this index or in ${MANUAL_INDEX}`);
  }
  return outline;
}

/** The outline as Starlight's sidebar: links by address, so that Starlight fails on one that leads nowhere. */
export function starlightSidebar(outline, version) {
  return [
    { slug: outline.overview.slug, label: outline.overview.label, badge: version },
    ...outline.groups.map((group) => ({
      label: group.label,
      items: group.entries.map((e) => ({
        slug: e.slug,
        label: e.label,
        ...(e.chapter ? { attrs: { 'data-chapter': String(e.chapter) } } : {}),
      })),
    })),
  ];
}

function findLink(node) {
  let link;
  if (node) {
    visit(node, 'link', (found) => {
      link = found;
      return EXIT;
    });
  }
  return link;
}
