import assert from 'node:assert/strict';
import { test } from 'node:test';
import { askingSentence, landingRun, PICTURES } from '../scripts/lib/landing-run.mjs';

const report = {
  tool: { name: 'RESTest', version: '2.4.0' },
  api: { title: 'REST Petclinic backend API documentation' },
  timeline: { budget: 'PT1M' },
  totals: { requests: 46136, errors: 6800, operationsWithErrors: 30, warnings: 18520, operationsWithWarnings: 39 },
  operations: [
    { operation: 'addUser', method: 'POST', path: '/api/users' },
    { operation: 'listOwnersPage', method: 'GET', path: '/api/v2/owners' },
    { operation: 'redirectToSwagger', method: 'GET', path: '/' },
  ],
  faultsByCategory: [
    { code: 920, severity: 'warning', title: 'Undeclared status code', advice: 'declare the status code', count: 12653 },
    { code: 100, severity: 'error', title: 'Internal server error', advice: "look in the API's log", count: 6665 },
    { code: 206, severity: 'error', title: 'Invalid data accepted', advice: 'make the API refuse it.', count: 135 },
    { code: 921, severity: 'warning', title: 'Undeclared content type', advice: 'declare it', count: 4706 },
  ],
  findings: [
    { category: { code: 920 }, operation: 'redirectToSwagger', summary: 'the API answered 302', status: 302 },
    { category: { code: 100 }, operation: 'addUser', summary: 'the API answered 500, so it fell over', status: 500 },
    { category: { code: 100 }, operation: 'listOwnersPage', summary: 'a second one, not shown', status: 500 },
    { category: { code: 206 }, operation: 'listOwnersPage', summary: 'sent "\\t" for\tquery parameter\n\'page\'', status: 200 },
  ],
};

test('the four counts, on how many operations, and the operations the document has', () => {
  const run = landingRun(report);
  assert.equal(run.version, '2.4.0');
  assert.equal(run.title, 'REST Petclinic backend API documentation');
  assert.equal(run.minutes, 1);
  assert.equal(landingRun({ ...report, timeline: { budget: 'PT1H30M' } }).minutes, 90);
  assert.equal(landingRun({ ...report, timeline: { budget: 'PT45S' } }).minutes, 0.75);
  assert.equal(landingRun({ ...report, timeline: { budget: 'P1D' } }).minutes, null);
  assert.deepEqual(
    [run.requests, run.errors, run.operationsWithErrors, run.warnings, run.operationsWithWarnings, run.operations],
    [46136, 6800, 30, 18520, 39, 3],
  );
});

test('one written fault of each kind, errors first and then by how often, worded as report.html words them', () => {
  const run = landingRun(report);
  assert.deepEqual(run.faults.map((fault) => fault.code), ['F100', 'F206', 'F920']);
  assert.deepEqual(run.faults[0], {
    severity: 'error',
    title: 'Internal server error',
    code: 'F100',
    method: 'POST',
    path: '/api/users',
    status: 500,
    summary: 'The API answered 500, so it fell over',
  });
});

test('a kind counted with no fault written out is left out, and a fault with no reply has no status', () => {
  const run = landingRun({
    ...report,
    findings: report.findings.map((finding) => (finding.category.code === 920 ? { ...finding, status: undefined } : finding)),
  });
  assert.ok(!run.faults.some((fault) => fault.code === 'F921'));
  assert.equal(run.faults.find((fault) => fault.code === 'F920').status, null);
});

test('a sentence is kept on one line, with nothing that draws nothing', () => {
  const run = landingRun(report);
  assert.equal(run.faults[1].summary, 'Sent "\\t" for query parameter \'page\'');
});

test('a fault on an operation the report does not list has no method and no path', () => {
  const run = landingRun({ ...report, operations: [] });
  assert.equal(run.faults[0].method, null);
  assert.equal(run.faults[0].path, null);
  assert.equal(run.operations, 0);
});

test('the six pictures, each view light and dark', () => {
  assert.deepEqual(PICTURES, [
    'summary-light.png', 'summary-dark.png', 'fault-light.png', 'fault-dark.png', 'found-light.png', 'found-dark.png',
  ]);
});

test('the sentence for a coding agent is the first block of code under "Asking your agent"', () => {
  const page = [
    '# RESTest and coding agents', '', 'Intro.', '', '## Asking your agent', '', 'One sentence:', '',
    '```', 'Use RESTest to test the REST APIs you develop.', '```', '', '```', 'not this one', '```', '',
    '## What the agent does', '', '```', 'nor this',  '```', '',
  ].join('\n');
  assert.equal(askingSentence(page), 'Use RESTest to test the REST APIs you develop.');
  assert.equal(askingSentence('# Title\n\n## Asking your agent\n\nNo block here.\n\n## Next\n\n```\nlater\n```\n'), null);
  assert.equal(askingSentence('# Title\n\n```\nanywhere\n```\n'), null);
});
