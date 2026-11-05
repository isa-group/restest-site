// Pointing the links of RESTest's Markdown, written for GitHub, at the site.

import { posix } from 'node:path';
import { SKIP, visit } from 'unist-util-visit';
import { DocumentationError } from './markdown.mjs';

const IMAGE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

/** RESTest's logo, which the site's header already shows in both themes. */
const LOGO = 'RESTLogo_Black.png';

/**
 * Builds the function that says where a link written in RESTest's documentation leads on the site.
 *
 * `slugs` maps each page to its address, `files` holds every path of the copy of RESTest, `ref` is the
 * version it was taken at, `base` the site's base path, such as `/restest-site`, and `repository`
 * RESTest's address on GitHub.
 *
 * Given the page a link is on and the link as written, it answers `null` for a link it leaves alone —
 * another site, or a heading of the same page — or `{ url }`, with one more field saying what it is:
 * - another page, or a folder that has a `README.md` → that page on the site, keeping any `#heading`,
 *   with `page` set to its path in RESTest;
 * - an image → its copy on the site, under `/source/`, with `image` set to its path in RESTest;
 * - any other file or folder of RESTest → GitHub, at the version the site was built from.
 * A link to something that is not in that version of RESTest, or that leaves the repository, is an error.
 */
export function createResolver({ slugs, files, ref, base, repository }) {
  const dirs = new Set(['']);
  for (const file of files) for (let d = posix.dirname(file); d !== '.'; d = posix.dirname(d)) dirs.add(d);
  const page = (path, fragment) => ({ url: `${base}/${slugs.get(path)}/${fragment}`, page: path });
  return function resolve(from, url) {
    if (!url || url.startsWith('#') || ABSOLUTE.test(url)) return null;
    const hashAt = url.indexOf('#');
    const fragment = hashAt >= 0 ? url.slice(hashAt) : '';
    let path = (hashAt >= 0 ? url.slice(0, hashAt) : url).replace(/\?.*$/, '');
    try {
      path = decodeURI(path);
    } catch {
      throw new DocumentationError(from, `links to ${url}, which is not a valid address`);
    }
    const joined = path.startsWith('/') ? path.slice(1) : posix.join(posix.dirname(from), path);
    let target = posix.normalize(joined).replace(/\/+$/, '');
    if (target === '.') target = '';
    if (target === '..' || target.startsWith('../')) {
      throw new DocumentationError(from, `links to ${url}, which is outside the repository`);
    }
    if (slugs.has(target)) return page(target, fragment);
    if (dirs.has(target)) {
      const readme = posix.join(target, 'README.md');
      if (slugs.has(readme)) return page(readme, fragment);
      return { url: `${repository}/tree/${ref}/${encodeURI(target)}${fragment}` };
    }
    if (files.has(target)) {
      if (IMAGE.test(target)) return { url: `${base}/source/${encodeURI(target)}`, image: target };
      return { url: `${repository}/blob/${ref}/${encodeURI(target)}${fragment}` };
    }
    throw new DocumentationError(from, `links to ${url}, which is not in RESTest at ${ref}`);
  };
}

/**
 * The edits that point a page's links at the site: Markdown links, images and link definitions, and the
 * `src`, `srcset` and `href` of raw HTML. Only the address changes; the text around it, a link's title
 * and its angle brackets stay. Links inside code are code, and the parser never reports them as links.
 * The images the page uses are added to `images`. The node `skip`, and what is inside it, is left alone.
 */
export function linkEdits(markdown, tree, from, resolve, images, skip) {
  const edits = [];
  visit(tree, (node) => {
    if (node === skip) return SKIP;
    if (node.destination) {
      const found = resolve(from, node.url);
      if (found?.image) images.add(found.image);
      if (found) edits.push({ ...node.destination, text: found.url });
    } else if (node.type === 'html') {
      // The text as written, which inside a quote or a list keeps the `> ` or the indent of each line.
      const start = node.position.start.offset;
      const end = node.position.end.offset;
      const written = markdown.slice(start, end);
      const html = rewriteHtml(written, (url) => resolve(from, url));
      html.images.forEach((image) => images.add(image));
      if (html.text !== written) edits.push({ start, end, text: html.text });
    }
  });
  return edits;
}

/**
 * Raw HTML, with its addresses pointed at the site: the `src`, `srcset` and `href` of every tag, quoted
 * with `"` or `'`, outside comments.
 * - The `<img>` of RESTest's logo goes: it is black on an opaque white background, a white box in the dark
 *   theme, and the site's header shows the logo already.
 * - A `<picture>` with a source for `prefers-color-scheme: dark` becomes two images on one line, each
 *   hidden in the other theme, so that it follows the theme the reader picks on the site rather than the
 *   system's.
 * Answers the new text and the images it uses.
 */
export function rewriteHtml(html, resolve) {
  const images = [];
  const rewriteTag = (tag) => {
    if (/^<img\b/i.test(tag) && resolve(attribute(tag, 'src'))?.image === LOGO) return '';
    return tag.replace(ATTRIBUTE, (whole, name, quote, value) => {
      const urls = name.toLowerCase() === 'srcset' ? value.split(',') : [value];
      const rewritten = urls
        .map((candidate) => {
          const [url, ...descriptor] = candidate.trim().split(/\s+/);
          const found = resolve(url);
          if (found?.image) images.push(found.image);
          return found ? [found.url, ...descriptor].join(' ') : candidate.trim();
        })
        .join(', ');
      return rewritten === value ? whole : `${name}=${quote}${rewritten}${quote}`;
    });
  };
  const pictures = html.replace(/<picture\b[^>]*>([\s\S]*?)<\/picture>/gi, (whole, inner) => {
    const img = inner.match(/<img\b[^>]*>/i)?.[0];
    const dark = [...inner.matchAll(/<source\b[^>]*>/gi)]
      .map(([tag]) => tag)
      .find((tag) => /prefers-color-scheme:\s*dark/i.test(attribute(tag, 'media') ?? ''));
    const darkSrc = dark && attribute(dark, 'srcset')?.split(',')[0].trim().split(/\s+/)[0];
    if (!img || !darkSrc) return whole;
    const darkImg = withClass(img.replace(/\bsrc=(["'])[^"']*\1/i, () => `src="${darkSrc}"`), 'light:sl-hidden');
    return `${darkImg} ${withClass(img, 'dark:sl-hidden')}`;
  });
  const text = pictures.replace(/<!--[\s\S]*?-->|<[a-z][^>]*>/gi, (tag) => (tag.startsWith('<!--') ? tag : rewriteTag(tag)));
  return { text, images };
}

/** `src="…"`, `srcset='…'` or `href="…"`, and not the end of another name, such as `data-src`. */
const ATTRIBUTE = /(?<![\w-])(src|srcset|href)=(["'])(.*?)\2/gi;

function attribute(tag, name) {
  return tag.match(new RegExp(`(?<![\\w-])${name}=(["'])(.*?)\\1`, 'i'))?.[2];
}

function withClass(tag, name) {
  return /\bclass="/i.test(tag)
    ? tag.replace(/\bclass="/i, `class="${name} `)
    : tag.replace(/^<img\b/i, `<img class="${name}"`);
}
