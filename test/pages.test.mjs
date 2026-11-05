import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from '../scripts/lib/markdown.mjs';
import { addressPages, buildPage, frontMatter, isPage, slugOf, titleOf } from '../scripts/lib/pages.mjs';

test('a page of docs/ is published at its path, in lower case', () => {
  assert.equal(slugOf('docs/command-line.md'), 'docs/command-line');
  assert.equal(slugOf('docs/DESIGN.md'), 'docs/design');
});

test('a name with other characters gets the address Astro gives its file', () => {
  assert.equal(slugOf('docs/Release Notes v2.4.md'), 'docs/release-notes-v24');
});

test('a chapter of the manual loses the number that orders it', () => {
  assert.equal(slugOf('docs/manual/04-reading-what-a-run-says.md'), 'docs/manual/reading-what-a-run-says');
});

test('a decision record keeps its number', () => {
  assert.equal(slugOf('docs/adr/0031-the-manual-is-markdown-only.md'), 'docs/adr/0031-the-manual-is-markdown-only');
});

test("a folder's README is the folder's page", () => {
  assert.equal(slugOf('docs/README.md'), 'docs');
  assert.equal(slugOf('docs/manual/README.md'), 'docs/manual');
  assert.equal(slugOf('docs/adr/README.md'), 'docs/adr');
});

test('the README, the rules and the guide to contributing are pages under /docs/', () => {
  assert.equal(slugOf('README.md'), 'docs/readme');
  assert.equal(slugOf('AGENTS.md'), 'docs/agents');
  assert.equal(slugOf('CONTRIBUTING.md'), 'docs/contributing');
});

test('only Markdown under docs/ and the three files at the root are pages', () => {
  assert.ok(isPage('docs/faults.md'));
  assert.ok(isPage('AGENTS.md'));
  assert.ok(!isPage('NOTICE.md'));
  assert.ok(!isPage('docs/images/the-page.png'));
  assert.ok(!isPage('skills/restest/SKILL.md'));
});

test('two files that would be published at one address are refused, naming both', () => {
  assert.throws(() => addressPages(['AGENTS.md', 'docs/agents.md']), /docs\/agents\.md: would be published at \/docs\/agents\/, as AGENTS\.md is/);
  assert.throws(() => addressPages(['docs/manual/07-settings.md', 'docs/manual/settings.md']), /\/docs\/manual\/settings\//);
  assert.throws(() => addressPages(['README.md', 'docs/readme.md']), /\/docs\/readme\//);
});

test('every page gets an address', () => {
  const slugs = addressPages(['README.md', 'docs/README.md', 'docs/faults.md', 'pom.xml']);
  assert.deepEqual([...slugs], [['README.md', 'docs/readme'], ['docs/README.md', 'docs'], ['docs/faults.md', 'docs/faults']]);
});

test('the title is the first # heading, without its formatting', () => {
  const markdown = '<img src="x.png">\n\n# ADR-0011: The harness lives in `evaluation/`, **outside** the build\n\n## Context\n';
  assert.equal(titleOf('x.md', parse(markdown)).title, 'ADR-0011: The harness lives in evaluation/, outside the build');
});

test('a page with no title is refused, naming the file', () => {
  assert.throws(() => titleOf('docs/untitled.md', parse('Some text.\n\n## A section\n')), /docs\/untitled\.md: has no title/);
});

test('front matter quotes a title that holds a colon', () => {
  assert.equal(frontMatter({ title: 'ADR-0001: Record "decisions"' }), '---\ntitle: "ADR-0001: Record \\"decisions\\""\n---\n');
});

const noLinks = () => null;

test('a page loses its title line and nothing else', () => {
  const markdown = '> A notice before the title.\n\n# The command line\n\nEvery option.\n';
  const page = buildPage('docs/command-line.md', markdown, { resolve: noLinks, editBase: 'https://example.org/edit/master' });
  assert.equal(page.title, 'The command line');
  assert.equal(
    page.text,
    '---\ntitle: "The command line"\neditUrl: "https://example.org/edit/master/docs/command-line.md"\n---\n> A notice before the title.\n\n\nEvery option.\n',
  );
});

test('a byte-order mark is dropped before anything is changed', () => {
  const page = buildPage('docs/faults.md', '\uFEFF# Faults\n\nText.\n', { resolve: noLinks, editBase: 'e' });
  assert.equal(page.title, 'Faults');
  assert.match(page.text, /---\n\nText\.\n$/);
});

test('a page with front matter of its own is refused, naming it', () => {
  assert.throws(() => buildPage('docs/DESIGN.md', '---\ntitle: X\n---\n\n# Design\n', { resolve: noLinks, editBase: 'e' }), /docs\/DESIGN\.md: starts with front matter/);
});
