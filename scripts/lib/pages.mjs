// Which of RESTest's files are pages of the site, at what address, with what title.

import { posix } from 'node:path';
import { slug } from 'github-slugger';
import { linkEdits } from './links.mjs';
import { DocumentationError, applyEdits, parse, plainText } from './markdown.mjs';

/** The files at the root of RESTest that are pages too: `docs/README.md` links each of them. */
export const ROOT_PAGES = ['README.md', 'AGENTS.md', 'CONTRIBUTING.md'];

/** Whether a path in RESTest, such as `docs/manual/03-a-first-run.md`, is a page of the site. */
export function isPage(path) {
  return ROOT_PAGES.includes(path) || (path.startsWith('docs/') && path.endsWith('.md'));
}

/**
 * The page's address on the site, without slashes around it:
 * - `docs/command-line.md` → `docs/command-line`, and `docs/DESIGN.md` → `docs/design`: each part of
 *   the path made an address as Astro makes it, so that the page is where the sidebar and links expect;
 * - a chapter, `docs/manual/03-a-first-run.md` → `docs/manual/a-first-run`: the number only orders the
 *   chapters, so a chapter keeps its address when another is inserted before it;
 * - a folder's `README.md` is the folder's page: `docs/adr/README.md` → `docs/adr`;
 * - a page at the root, `AGENTS.md` → `docs/agents`.
 * Decision records keep their number, which is what cites them.
 */
export function slugOf(path) {
  const dir = posix.dirname(path);
  const name = posix.basename(path, '.md');
  let where;
  if (ROOT_PAGES.includes(path)) where = `docs/${name}`;
  else if (name === 'README') where = dir;
  else where = `${dir}/${dir === 'docs/manual' ? name.replace(/^\d+-/, '') : name}`;
  return where.split('/').map((part) => slug(part)).join('/');
}

/** Maps every page to its address, and refuses two pages that would share one. */
export function addressPages(paths) {
  const slugs = new Map();
  const owners = new Map();
  for (const path of paths.filter(isPage).sort()) {
    const address = slugOf(path);
    if (owners.has(address)) {
      throw new DocumentationError(path, `would be published at /${address}/, as ${owners.get(address)} is`);
    }
    owners.set(address, path);
    slugs.set(path, address);
  }
  return slugs;
}

/**
 * The page's title, the text of its first `#` heading without its formatting, and that heading, so that it
 * can be taken out: the site sets the title above the page itself.
 */
export function titleOf(path, tree) {
  const heading = tree.children.find((node) => node.type === 'heading' && node.depth === 1);
  if (!heading) throw new DocumentationError(path, 'has no title, a first line starting with `# `');
  const title = plainText(heading).trim();
  if (!title) throw new DocumentationError(path, 'has an empty title');
  return { title, heading };
}

/** The front matter the site's pages are written with. JSON strings are YAML too, and quote any `: `. */
export function frontMatter(fields) {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

/**
 * One page of RESTest's documentation as the site publishes it: front matter with its title and where to
 * edit it, then the Markdown as RESTest has it, without its title line and with its links pointed at the
 * site. Every other character stays as it was. Answers the title, the text and the images the page uses.
 *
 * A byte-order mark is dropped first: the parser skips it without counting it, so every change would land
 * one character early. A page with front matter of its own is refused, since the site writes its own.
 */
export function buildPage(path, source, { resolve, editBase }) {
  const markdown = source.replace(/^﻿/, '');
  if (/^---\r?\n/.test(markdown)) throw new DocumentationError(path, 'starts with front matter, which RESTest\'s pages do not have');
  const tree = parse(markdown);
  const { title, heading } = titleOf(path, tree);
  const start = heading.position.start.offset;
  const end = heading.position.end.offset;
  const images = new Set();
  const edits = [
    { start, end: markdown[end] === '\n' ? end + 1 : end, text: '' },
    ...linkEdits(markdown, tree, path, resolve, images, heading),
  ];
  return { title, text: frontMatter({ title, editUrl: `${editBase}/${path}` }) + applyEdits(markdown, edits), images };
}
