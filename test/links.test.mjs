import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createResolver, rewriteHtml } from '../scripts/lib/links.mjs';
import { buildPage, addressPages } from '../scripts/lib/pages.mjs';

const files = [
  'LICENSE',
  'RESTLogo_Black.png',
  'README.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/command-line.md',
  'docs/faults.md',
  'docs/images/report-light.png',
  'docs/images/report-dark.png',
  'docs/manual/README.md',
  'docs/manual/03-a-first-run.md',
  'docs/adr/README.md',
  'docs/adr/0031-the-manual-is-markdown-only.md',
  'schemas/plan.schema.json',
];
const slugs = addressPages(files);
const resolve = createResolver({
  slugs,
  files: new Set(files),
  ref: 'v2.4.0',
  base: '/restest-site',
  repository: 'https://github.com/isa-group/RESTest',
});
const at = (from, url) => resolve(from, url)?.url;

test('a link to another page leads to that page on the site, keeping its heading', () => {
  assert.equal(at('docs/manual/03-a-first-run.md', '../command-line.md'), '/restest-site/docs/command-line/');
  assert.equal(at('docs/manual/03-a-first-run.md', '../faults.md#internal-server-error'), '/restest-site/docs/faults/#internal-server-error');
  assert.equal(at('docs/README.md', '../AGENTS.md'), '/restest-site/docs/agents/');
  assert.equal(at('README.md', 'docs/manual/03-a-first-run.md'), '/restest-site/docs/manual/a-first-run/');
});

test('a link to a folder with a README leads to its page', () => {
  assert.equal(at('docs/README.md', 'adr'), '/restest-site/docs/adr/');
  assert.equal(at('docs/README.md', 'adr/'), '/restest-site/docs/adr/');
  assert.equal(at('docs/adr/0031-the-manual-is-markdown-only.md', 'README.md'), '/restest-site/docs/adr/');
});

test('a link to any other file or folder of RESTest leads to GitHub, at the version built', () => {
  assert.equal(at('README.md', 'LICENSE'), 'https://github.com/isa-group/RESTest/blob/v2.4.0/LICENSE');
  assert.equal(at('docs/README.md', '../schemas/plan.schema.json'), 'https://github.com/isa-group/RESTest/blob/v2.4.0/schemas/plan.schema.json');
  assert.equal(at('docs/README.md', '../schemas'), 'https://github.com/isa-group/RESTest/tree/v2.4.0/schemas');
});

test('a link to a page says which page it is', () => {
  assert.equal(resolve('docs/README.md', 'adr/')?.page, 'docs/adr/README.md');
  assert.equal(resolve('docs/README.md', 'command-line.md#exit-codes')?.page, 'docs/command-line.md');
});

test('an image leads to its copy on the site, and says which file to copy', () => {
  assert.deepEqual(resolve('docs/faults.md', 'images/report-light.png'), {
    url: '/restest-site/source/docs/images/report-light.png',
    image: 'docs/images/report-light.png',
  });
});

test('links to other sites and to a heading of the same page are left alone', () => {
  assert.equal(resolve('docs/faults.md', 'https://example.org/x.md'), null);
  assert.equal(resolve('docs/faults.md', 'mailto:someone@example.org'), null);
  assert.equal(resolve('docs/faults.md', '#errors'), null);
});

test('a link to something not in that version of RESTest is an error naming the page and the link', () => {
  assert.throws(() => resolve('docs/faults.md', 'gone.md'), /docs\/faults\.md: links to gone\.md, which is not in RESTest at v2\.4\.0/);
});

test('a link that leaves the repository is an error', () => {
  assert.throws(() => resolve('docs/faults.md', '../../../etc/passwd'), /docs\/faults\.md: links to .*outside the repository/);
});

const build = (path, markdown) => buildPage(path, markdown, { resolve, editBase: 'https://github.com/isa-group/RESTest/edit/master' });
const body = (page) => page.text.replace(/^---\n[\s\S]*?\n---\n/, '');

test('only the addresses change; every other character stays as it was', () => {
  const markdown = [
    '# Faults',
    '',
    'See [the command line](../docs/command-line.md "Every option") and *[the README](../README.md)*,',
    'with a [definition][cli].',
    '',
    '| Page | What |',
    '|---|---|',
    '| [Exit codes](command-line.md#exit-codes) | The number a run ends with |',
    '',
    '[cli]: command-line.md',
    '',
  ].join('\n');
  assert.equal(
    body(build('docs/faults.md', markdown)),
    [
      '',
      'See [the command line](/restest-site/docs/command-line/ "Every option") and *[the README](/restest-site/docs/readme/)*,',
      'with a [definition][cli].',
      '',
      '| Page | What |',
      '|---|---|',
      '| [Exit codes](/restest-site/docs/command-line/#exit-codes) | The number a run ends with |',
      '',
      '[cli]: /restest-site/docs/command-line/',
      '',
    ].join('\n'),
  );
});

test('links inside code are code, and stay as they are', () => {
  const markdown = '# Faults\n\nInline `[x](gone.md)` code.\n\n```markdown\n[y](also-gone.md)\n```\n';
  assert.equal(body(build('docs/faults.md', markdown)), '\nInline `[x](gone.md)` code.\n\n```markdown\n[y](also-gone.md)\n```\n');
});

test('in a link around an image, only the address that leads to RESTest changes', () => {
  const markdown = '# RESTest\n\n[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)\n';
  assert.equal(
    body(build('README.md', markdown)),
    '\n[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/isa-group/RESTest/blob/v2.4.0/LICENSE)\n',
  );
});

test('an address written in angle brackets keeps them', () => {
  assert.equal(body(build('docs/faults.md', '# F\n\n[cli](<command-line.md>)\n')), '\n[cli](</restest-site/docs/command-line/>)\n');
});

test('the images a page uses are collected, from Markdown and from HTML', () => {
  const page = build('docs/faults.md', '# F\n\n![A report](images/report-light.png)\n\n<img src="images/report-dark.png" alt="">\n');
  assert.deepEqual([...page.images].sort(), ['docs/images/report-dark.png', 'docs/images/report-light.png']);
  assert.match(page.text, /<img src="\/restest-site\/source\/docs\/images\/report-dark\.png" alt="">/);
});

test("RESTest's logo goes, since the site's header shows it", () => {
  const page = build('README.md', '<img src="RESTLogo_Black.png" alt="RESTest" width="200">\n\n# RESTest\n\nText.\n');
  assert.equal(body(page), '\n\n\nText.\n');
  assert.equal(page.images.size, 0);
});

test('a picture for light and dark becomes two images, each hidden in the other theme', () => {
  const html = [
    '<picture>',
    '  <source media="(prefers-color-scheme: dark)" srcset="docs/images/report-dark.png">',
    '  <img src="docs/images/report-light.png" alt="The report">',
    '</picture>',
  ].join('\n');
  const out = rewriteHtml(html, (url) => resolve('README.md', url));
  assert.equal(
    out.text,
    '<img class="light:sl-hidden" src="/restest-site/source/docs/images/report-dark.png" alt="The report"> ' +
      '<img class="dark:sl-hidden" src="/restest-site/source/docs/images/report-light.png" alt="The report">',
  );
  assert.deepEqual(out.images.sort(), ['docs/images/report-dark.png', 'docs/images/report-light.png']);
});

test('a link to nothing fails the page, naming it', () => {
  assert.throws(() => build('docs/faults.md', '# F\n\n[x](command-line.md)\n[y](gone.md)\n'), /docs\/faults\.md: links to gone\.md/);
});

const html = (text) => rewriteHtml(text, (url) => resolve('README.md', url)).text;

test('a link in raw HTML leads where a Markdown link would', () => {
  assert.equal(html('<a href="docs/faults.md#errors">faults</a>'), '<a href="/restest-site/docs/faults/#errors">faults</a>');
  assert.equal(html("<img src='docs/images/report-light.png'>"), "<img src='/restest-site/source/docs/images/report-light.png'>");
});

test('only srcset is a list; a comma in any other address is part of it', () => {
  assert.equal(html('<img src="https://img.shields.io/badge/java-21,25-blue">'), '<img src="https://img.shields.io/badge/java-21,25-blue">');
  assert.equal(
    html('<img srcset="docs/images/report-light.png 1x, docs/images/report-dark.png 2x">'),
    '<img srcset="/restest-site/source/docs/images/report-light.png 1x, /restest-site/source/docs/images/report-dark.png 2x">',
  );
});

test('attributes that only end in src or href, and comments, are left alone', () => {
  assert.equal(html('<img data-src="whatever" src="docs/images/report-light.png">'), '<img data-src="whatever" src="/restest-site/source/docs/images/report-light.png">');
  assert.equal(html('<!-- <a href="gone.md">old</a> -->'), '<!-- <a href="gone.md">old</a> -->');
});

test('the dark image of a picture is the first address of its srcset', () => {
  const out = html('<picture><source media="(prefers-color-scheme: dark)" srcset="docs/images/report-dark.png 2x"><img src="docs/images/report-light.png"></picture>');
  assert.match(out, /^<img class="light:sl-hidden" src="\/restest-site\/source\/docs\/images\/report-dark\.png"> /);
});

test('raw HTML inside a quote keeps the marks of the quote', () => {
  const markdown = '# RESTest\n\n> <picture>\n>   <source media="(prefers-color-scheme: dark)" srcset="docs/images/report-dark.png">\n>   <img src="docs/images/report-light.png" alt="">\n> </picture>\n';
  const lines = body(build('README.md', markdown)).split('\n').filter(Boolean);
  assert.ok(lines.every((line) => line.startsWith('>')), lines.join('\n'));
  assert.equal(lines.filter((line) => line.includes('<img')).length, 1);
});
