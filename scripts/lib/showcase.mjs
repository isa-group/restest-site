// What the showcase shows of the campaigns isa-group/restest-dataset publishes, one release each: which
// campaigns there are, and the row of each API in a campaign's table, read from that API's report.json.

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { minutes } from './landing-run.mjs';

/** The repository whose releases are the campaigns. */
export const DATASET = 'isa-group/restest-dataset';

/** What the manifest's format is, as the dataset's README defines it; another means the site must change. */
const FORMAT = 1;

const TAG = /^showcase-v(\d+)\.(\d+)\.(\d+)$/;

/** A name that can be part of a path as it is: an API's id or a version, read from another repository. */
const SAFE = /^[a-z0-9][a-z0-9.-]*$/;

/** Something in a campaign the site cannot be built from, said with the release or the file it is in. */
export class ShowcaseError extends Error {}

/**
 * The campaigns the site shows, from the dataset's releases: those tagged showcase-vX.Y.Z that are neither
 * drafts nor prereleases, the newest version first. The version decides, not the date a release was
 * published, so that a campaign of 2.5.1 published after 2.6.0's never comes first.
 */
export function campaigns(releases) {
  return releases
    .filter((release) => !release.draft && !release.prerelease && isCampaignTag(release.tag_name))
    .sort((a, b) => newerFirst(a.tag_name, b.tag_name));
}

/** Whether a tag names a campaign: showcase-vX.Y.Z. */
export const isCampaignTag = (tag) => TAG.test(tag ?? '');

/** Orders two campaigns' tags, the newer version first. */
export function newerFirst(a, b) {
  const [x, y] = [a, b].map((tag) => TAG.exec(tag).slice(1).map(Number));
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
}

/** Fails, naming the release, unless its manifest is of the format the site reads and is the tag's campaign. */
export function checkManifest(tag, manifest) {
  if (manifest?.format !== FORMAT) {
    throw new ShowcaseError(`${tag}: manifest.json is of format ${manifest?.format}, and the site reads ${FORMAT}`);
  }
  const version = tag.replace(/^showcase-v/, '');
  if (manifest.restest?.version !== version) {
    throw new ShowcaseError(`${tag}: manifest.json is the campaign of RESTest ${manifest.restest?.version}`);
  }
  if (!SAFE.test(version) || !Array.isArray(manifest.apis)) {
    throw new ShowcaseError(`${tag}: manifest.json lists no APIs`);
  }
  for (const api of manifest.apis) {
    if (!SAFE.test(api?.id ?? '')) throw new ShowcaseError(`${tag}: manifest.json names an API "${api?.id}"`);
  }
}

/**
 * An API's row in its campaign's table. With a report: its operations, requests, errors and warnings, and its
 * operations by what was found, each counted once — with an error, else with only warnings, else tested with
 * nothing found, else not tested. Without one: what became of it, and why.
 */
export function campaignRow(entry, report) {
  const row = { id: entry.id, title: entry.title, outcome: entry.outcome, reason: entry.reason ?? null };
  if (!report) return row;
  const { totals, operations } = report;
  if (!totals || !Array.isArray(operations)) throw new ShowcaseError('has no totals or no operations');
  const found = (severity) =>
    new Set((report.faultsByOperation ?? []).filter((fault) => fault.severity === severity).map((fault) => fault.operation));
  const errors = found('error');
  const warnings = [...found('warning')].filter((operation) => !errors.has(operation));
  const tested = operations.filter((operation) => operation.state === 'tested').map((operation) => operation.operation);
  return {
    ...row,
    operations: operations.length,
    requests: totals.requests ?? 0,
    errors: totals.errors ?? 0,
    warnings: totals.warnings ?? 0,
    withErrors: errors.size,
    onlyWarnings: warnings.length,
    nothing: tested.filter((operation) => !errors.has(operation) && !warnings.includes(operation)).length,
    notTested: operations.length - tested.length,
  };
}

/** A campaign's five figures: its APIs, the requests, errors and warnings of all of them, and how many had an error. */
export function campaignTotals(rows) {
  const sum = (key) => rows.reduce((total, row) => total + (row[key] ?? 0), 0);
  return {
    apis: rows.length,
    requests: sum('requests'),
    errors: sum('errors'),
    warnings: sum('warnings'),
    apisWithErrors: rows.filter((row) => row.errors > 0).length,
  };
}

/** The APIs with the most errors, most first. */
export function mostErrors(rows, count = 5) {
  return rows
    .filter((row) => row.errors > 0)
    .sort((a, b) => b.errors - a.errors || a.id.localeCompare(b.id))
    .slice(0, count);
}

/**
 * Everything the showcase shows, from its campaigns, the newest first. Each campaign is its tag and a
 * function giving the local path of one of its release's files, or null when the release has none of that
 * name. The newest campaign's report.html files are copied into `publicDir`, to be served by the site; an
 * older campaign's rows link to theirs in the release.
 */
export async function buildShowcase(sources, { publicDir }) {
  const built = [];
  for (const [index, source] of sources.entries()) {
    const { tag } = source;
    const read = async (name) => {
      const file = await source.file(name);
      if (!file) throw new ShowcaseError(`${tag}: the release has no ${name}, which its manifest names`);
      return file;
    };
    const manifest = parse(tag, 'manifest.json', readFileSync(await read('manifest.json'), 'utf8'));
    checkManifest(tag, manifest);
    const version = manifest.restest.version;
    const newest = index === 0;
    const apis = [];
    for (const entry of manifest.apis) {
      const report = entry.report ? parse(tag, entry.report, readFileSync(await read(entry.report), 'utf8')) : null;
      let row;
      try {
        row = campaignRow(entry, report);
      } catch (error) {
        if (error instanceof ShowcaseError) throw new ShowcaseError(`${tag}: ${entry.report} ${error.message}`);
        throw error;
      }
      let page = null;
      if (entry.page && newest) {
        mkdirSync(join(publicDir, version), { recursive: true });
        copyFileSync(await read(entry.page), join(publicDir, version, `${entry.id}.html`));
        page = { href: `showcase/${version}/${entry.id}.html`, here: true };
      } else if (entry.page) {
        page = { href: `https://github.com/${DATASET}/releases/download/${tag}/${entry.page}`, here: false };
      }
      apis.push({ ...row, page });
    }
    built.push({
      version,
      release: `https://github.com/${DATASET}/releases/tag/${tag}`,
      date: (manifest.startedAt ?? '').slice(0, 10),
      minutes: minutes(manifest.budget),
      runner: manifest.runner
        ? { label: manifest.runner.label, cpus: manifest.runner.cpus, memoryGiB: manifest.runner.memoryGiB }
        : null,
      apis,
      totals: campaignTotals(apis),
      mostErrors: mostErrors(apis).map((row) => row.id),
    });
  }
  return { campaigns: built };
}

function parse(tag, name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ShowcaseError(`${tag}: ${name} cannot be read: ${error.message}`);
  }
}
