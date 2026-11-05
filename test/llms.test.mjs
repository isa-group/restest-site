import assert from 'node:assert/strict';
import { test } from 'node:test';
import { llmsTxt } from '../scripts/lib/llms.mjs';

test('llms.txt says which version it describes, and links each page as Markdown with its description', () => {
  const outline = {
    overview: { path: 'docs/README.md' },
    groups: [
      { label: 'Manual', entries: [{ path: 'docs/manual/01-what-restest-is-for.md', label: 'What RESTest is for', description: 'the problem it solves.' }] },
      { label: 'Using RESTest', entries: [{ path: 'docs/command-line.md', label: 'The command line', description: '' }] },
    ],
  };
  const raw = 'https://raw.githubusercontent.com/isa-group/RESTest/v2.4.0';
  assert.equal(
    llmsTxt(outline, { describes: 'RESTest 2.4.0', raw, overviewTitle: 'RESTest documentation' }),
    [
      '# RESTest',
      '',
      "> The documentation of RESTest 2.4.0, a black-box testing tool for REST APIs: a manual to read from the beginning, and one page per subject to look things up in. Each link is a page's Markdown in that version.",
      '',
      `- [RESTest documentation](${raw}/docs/README.md): every page, and what it covers`,
      '',
      '## Manual',
      '',
      `- [What RESTest is for](${raw}/docs/manual/01-what-restest-is-for.md): the problem it solves.`,
      '',
      '## Using RESTest',
      '',
      `- [The command line](${raw}/docs/command-line.md)`,
      '',
    ].join('\n'),
  );
});
