// Reading RESTest's Markdown as GitHub does, and changing parts of it in place.

import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toString } from 'mdast-util-to-string';
import { gfm } from 'micromark-extension-gfm';

/**
 * Parses GitHub-flavoured Markdown into a syntax tree whose nodes know where they are in the text. A link,
 * an image or a definition also knows where its address is written, as `destination`: the offsets of
 * `x.md` in `[text](x.md "title")`, `[text](<x.md>)` or `[id]: x.md`.
 */
export function parse(markdown) {
  return fromMarkdown(markdown, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown(), { enter: { resourceDestinationString: destination, definitionDestinationString: destination } }],
  });
}

function destination(token) {
  this.stack.at(-1).destination = { start: token.start.offset, end: token.end.offset };
  this.buffer();
}

/** The plain text of a node, or of a list of them, on one line: `A **bold**\n\`code\`` gives `A bold code`. */
export function plainText(node) {
  return toString(node, { includeHtml: false, includeImageAlt: false }).replace(/\s+/g, ' ');
}

/**
 * Applies edits, each `{ start, end, text }` over offsets of the original text, and leaves every other
 * character as it was. Edits may not overlap.
 */
export function applyEdits(markdown, edits) {
  const sorted = [...edits].sort((a, b) => a.start - b.start);
  let out = '';
  let at = 0;
  for (const edit of sorted) {
    if (edit.start < at) throw new Error(`overlapping edits at offset ${edit.start}`);
    out += markdown.slice(at, edit.start) + edit.text;
    at = edit.end;
  }
  return out + markdown.slice(at);
}

/** Thrown for anything in RESTest's documentation the site cannot build from; it names the file. */
export class DocumentationError extends Error {
  constructor(file, message) {
    super(`${file}: ${message}`);
    this.name = 'DocumentationError';
  }
}
