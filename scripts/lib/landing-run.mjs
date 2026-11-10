// What the site's first page takes from RESTest's documentation: the run its manual keeps, its figures and
// one fault of each kind, and the sentence its page for coding agents tells a person to give their agent.

import { parse, plainText } from './markdown.mjs';

/** Where RESTest keeps the run: its report.json, and pictures of its report.html. */
export const RUN = 'docs/manual/images/clinic-run';

/** The three views of report.html the first page shows, each in a light and a dark picture. */
export const VIEWS = ['summary', 'fault', 'found'];

export const PICTURES = VIEWS.flatMap((view) => [`${view}-light.png`, `${view}-dark.png`]);

/**
 * What the first page shows of a run, from its report.json: the version that made it, the minutes it was
 * given, its counts and on how many operations, and one written fault of each kind, the kinds in the order report.html's
 * "What was found" gives them, errors first, then by how often they were found. Each fault is worded as
 * report.html shows it when its operation is opened: the finding's sentence, with a capital. A kind the
 * report counted without writing one out is left out; a fault that got no reply has no status.
 */
export function landingRun(report) {
  const operations = new Map((report.operations ?? []).map((operation) => [operation.operation, operation]));
  const kinds = [...(report.faultsByCategory ?? [])].sort(
    (a, b) => rank(a) - rank(b) || (b.count ?? 0) - (a.count ?? 0),
  );
  const faults = [];
  for (const kind of kinds) {
    const found = (report.findings ?? []).find((finding) => finding.category?.code === kind.code);
    if (!found) continue;
    const operation = operations.get(found.operation);
    faults.push({
      severity: kind.severity,
      title: kind.title,
      code: `F${kind.code}`,
      method: operation?.method ?? null,
      path: operation?.path ?? null,
      status: Number.isInteger(found.status) ? found.status : null,
      summary: capital(clean(found.summary)),
    });
  }
  const totals = report.totals ?? {};
  return {
    version: report.tool?.version ?? null,
    title: report.api?.title ?? null,
    minutes: minutes(report.timeline?.budget),
    operations: (report.operations ?? []).length,
    requests: totals.requests ?? 0,
    errors: totals.errors ?? 0,
    operationsWithErrors: totals.operationsWithErrors ?? 0,
    warnings: totals.warnings ?? 0,
    operationsWithWarnings: totals.operationsWithWarnings ?? 0,
    faults,
  };
}

/** RESTest's page for coding agents, which RESTest has from 2.5.0 on. */
export const AGENTS_PAGE = 'docs/for-coding-agents.md';

/**
 * What a person is told to give their coding agent: the first block of code under the heading "Asking your
 * agent" of RESTest's page for coding agents, which RESTest holds its README to; null when there is none.
 */
export function askingSentence(markdown) {
  const nodes = parse(markdown).children;
  const at = nodes.findIndex((node) => node.type === 'heading' && plainText(node) === 'Asking your agent');
  if (at < 0) return null;
  for (const node of nodes.slice(at + 1)) {
    if (node.type === 'heading') return null;
    if (node.type === 'code') return node.value.trim() || null;
  }
  return null;
}

const rank = (kind) => (kind.severity === 'error' ? 0 : 1);

const capital = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);

/** On one line, with no character that draws nothing; RESTest has already shortened any value it quotes. */
const clean = (text) => String(text ?? '').replace(/[\p{Cc}\p{Cf}\s]+/gu, ' ').trim();

/** How many minutes the run was given, from its budget as report.json writes it (PT1M), or null. */
function minutes(budget) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(budget ?? '');
  return match && (match[1] || match[2]) ? Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) : null;
}
