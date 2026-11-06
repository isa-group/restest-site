// Mermaid diagrams, which GitHub draws from a code block marked `mermaid`, and so the site must draw too.

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/**
 * Turns a code block marked `mermaid` into a `<pre class="mermaid">` holding the diagram's text, which
 * src/components/MarkdownContent.astro draws as a picture in the browser. The block is then no code block,
 * so Expressive Code leaves it alone, and search does not index its text. Without JavaScript the text is
 * what the reader sees, as on GitHub.
 *
 * @type {import('satteri').MdastPluginDefinition}
 */
export const mermaidDiagrams = {
  name: 'restest-mermaid-diagrams',
  code(node) {
    if (node.lang !== 'mermaid') return;
    return { type: 'html', value: `<pre class="mermaid" data-pagefind-ignore>${escape(node.value)}</pre>` };
  },
};
