import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createResolver } from '../scripts/lib/links.mjs';
import { addressPages } from '../scripts/lib/pages.mjs';
import { buildOutline, readManual, readSections, starlightSidebar } from '../scripts/lib/sidebar.mjs';

// The two indexes as they are in RESTest 2.4.0.
const docsIndex = readFileSync(new URL('fixtures/docs-README.md', import.meta.url), 'utf8');
const manualIndex = readFileSync(new URL('fixtures/manual-README.md', import.meta.url), 'utf8');

test("the manual's chapters are its numbered list, in order, with the words after the dash", () => {
  const chapters = readManual(manualIndex);
  assert.equal(chapters.length, 11);
  assert.deepEqual(chapters[0], {
    url: '01-what-restest-is-for.md',
    label: 'What RESTest is for',
    description: 'the problem it solves, what it finds, and what it does not.',
    chapter: 1,
  });
  assert.equal(chapters[10].label, 'Glossary');
});

test("a link outside the manual's list, such as Before you start, is not a chapter", () => {
  assert.ok(!readManual(manualIndex).some((chapter) => chapter.label === 'Before you start'));
});

test('docs/README.md gives a group per ## heading, and an entry per row of its table', () => {
  const sections = readSections(docsIndex);
  assert.deepEqual(sections.map((s) => s.label), ['Using RESTest', 'Building RESTest']);
  assert.equal(sections[0].entries.length, 9);
  assert.deepEqual(sections[0].entries[0], {
    url: 'command-line.md',
    label: 'The command line',
    description: 'Every command, every option of a run, the environment variables, how to stop a run, and the number a run ends with',
  });
  assert.deepEqual(sections[1].entries.map((e) => e.label), ['The rules', 'Design', 'Continuous integration', 'Decision records', 'Contributing']);
});

test('a new section of docs/README.md becomes a new group, with no change to the site', () => {
  const more = `${docsIndex}\n## Running RESTest in the cloud\n\n| Page | What it covers |\n|---|---|\n| [On a server](server.md) | Somewhere else |\n`;
  assert.equal(readSections(more).at(-1).label, 'Running RESTest in the cloud');
});

test('an index that has changed shape is refused, naming it', () => {
  assert.throws(() => readManual('# The manual\n\n- [A](a.md)\n'), /docs\/manual\/README\.md: has no numbered list/);
  assert.throws(() => readSections('# Docs\n\nNo sections.\n'), /docs\/README\.md: has no section/);
  assert.throws(() => readSections('# Docs\n\n## Using RESTest\n\n- [A](a.md)\n'), /section "Using RESTest" has no table/);
  assert.throws(() => readSections('# Docs\n\n## Using\n\n| Page | What |\n|---|---|\n'), /section "Using" lists no page/);
  assert.throws(() => readSections('# Docs\n\n## Using\n\n| Page | What |\n|---|---|\n| No link | x |\n'), /a row of "Using" links no page/);
  assert.throws(() => readManual('# The manual\n\n1. [A](a.md)\n2. Plain words\n'), /chapter 2 of its list has no link/);
});

const pages = [
  'README.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/command-line.md',
  'docs/manual/README.md',
  'docs/manual/01-what-restest-is-for.md',
  'docs/adr/README.md',
  'docs/adr/0001-record-architecture-decisions.md',
];
const manual = [{ url: '01-what-restest-is-for.md', label: 'What RESTest is for', description: 'why', chapter: 1 }];
const sections = [
  { label: 'Using RESTest', entries: [{ url: 'command-line.md', label: 'The command line', description: 'options' }] },
  {
    label: 'Building RESTest',
    entries: [
      { url: '../AGENTS.md', label: 'The rules', description: 'rules' },
      { url: 'adr/README.md', label: 'Decision records', description: 'why' },
    ],
  },
];

const outlineOf = (paths, groups = sections) => {
  const slugs = addressPages(paths);
  const resolve = createResolver({ slugs, files: new Set(paths), ref: 'v2.4.0', base: '', repository: 'https://github.com/isa-group/RESTest' });
  return buildOutline({ manual, sections: groups, slugs, resolve });
};

test('the sidebar opens with the overview and the version, then the manual numbered, then the sections', () => {
  const outline = outlineOf(pages);
  assert.deepEqual(starlightSidebar(outline, 'v2.4.0'), [
    { slug: 'docs', label: 'Overview', badge: 'v2.4.0' },
    { label: 'Manual', items: [{ slug: 'docs/manual/what-restest-is-for', label: 'What RESTest is for', attrs: { 'data-chapter': '1' } }] },
    { label: 'Using RESTest', items: [{ slug: 'docs/command-line', label: 'The command line' }] },
    {
      label: 'Building RESTest',
      items: [
        { slug: 'docs/agents', label: 'The rules' },
        { slug: 'docs/adr', label: 'Decision records' },
      ],
    },
  ]);
});

test('a page in no index is refused, naming it; the README and the decision records need no entry', () => {
  assert.throws(() => outlineOf([...pages, 'docs/forgotten.md']), /docs\/README\.md: lists no entry for docs\/forgotten\.md;/);
});

test('an entry that leads to nothing, or to something that is not a page, is refused', () => {
  const gone = [{ label: 'Using RESTest', entries: [{ url: 'gone.md', label: 'Gone', description: '' }] }];
  assert.throws(() => outlineOf(pages, gone), /docs\/README\.md: links to gone\.md, which is not in RESTest/);
  const notAPage = [{ label: 'Using RESTest', entries: [{ url: '../LICENSE', label: 'Licence', description: '' }] }];
  assert.throws(() => outlineOf([...pages, 'LICENSE'], notAPage), /docs\/README\.md: lists \.\.\/LICENSE, which is not a page/);
});
