import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdownToHtml } from 'satteri';
import { mermaidDiagrams } from '../src/markdown/mermaid.mjs';

const html = (markdown) => markdownToHtml(markdown, { mdastPlugins: [mermaidDiagrams] }).html;

test('a block marked mermaid becomes the text of a diagram, escaped, which search leaves out', () => {
  const out = html('Before.\n\n```mermaid\nflowchart TB\n  a["A<br>&"] --> b\n```\n\nAfter.\n');
  assert.match(out, /<pre class="mermaid" data-pagefind-ignore>flowchart TB\n {2}a\["A&lt;br&gt;&amp;"\] --&gt; b<\/pre>/);
  assert.match(out, /<p>Before\.<\/p>/);
  assert.match(out, /<p>After\.<\/p>/);
});

test('any other code block stays a code block', () => {
  const out = html('```bash\necho "<mermaid>"\n```\n\n```\nplain\n```\n');
  assert.doesNotMatch(out, /class="mermaid"/);
  assert.match(out, /<pre><code class="language-bash">echo "&lt;mermaid&gt;"\n<\/code><\/pre>/);
});
