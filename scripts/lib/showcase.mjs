// What the showcase shows of the campaigns isa-group/restest-dataset publishes, one release each: which
// campaigns there are, and the row of each API in a campaign's table, read from that API's report.json.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { minutes } from './landing-run.mjs';

/** The repository whose releases are the campaigns. */
export const DATASET = 'isa-group/restest-dataset';

/** What the manifest's format is, as the dataset's README defines it; another means the site must change. */
const FORMAT = 1;

const TAG = /^showcase-v(\d+)\.(\d+)\.(\d+)$/;

/** A name that can be part of a path as it is: an API's id, read from another repository. "index" is the page's. */
const SAFE = /^(?!index$)[a-z0-9][a-z0-9.-]*$/;

/** Something in a campaign the site cannot be built from; it names the release or the file it is in. */
export class ShowcaseError extends Error {
  constructor(where, message) {
    super(`${where}: ${message}`);
    this.name = 'ShowcaseError';
  }
}

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

/** A campaign in a folder holding its release's files, to preview one not published, such as a draft. */
export function localCampaign(folder) {
  const dir = resolve(folder);
  const has = (name) => existsSync(join(dir, name));
  if (!has('manifest.json')) throw new ShowcaseError(folder, 'holds no manifest.json');
  let version;
  try {
    version = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).restest?.version;
  } catch (error) {
    throw new ShowcaseError(folder, `manifest.json cannot be read: ${error.message}`);
  }
  const tag = `showcase-v${version}`;
  if (!isCampaignTag(tag)) throw new ShowcaseError(folder, 'manifest.json names no version such as 2.5.0');
  return { tag, has, file: (name) => (has(name) ? join(dir, name) : null) };
}

/** Fails, naming the release, unless its manifest is of the format the site reads and is the tag's campaign. */
export function checkManifest(tag, manifest) {
  if (manifest?.format !== FORMAT) {
    throw new ShowcaseError(tag, `manifest.json is of format ${manifest?.format}, and the site reads ${FORMAT}`);
  }
  if (manifest.restest?.version !== tag.replace(/^showcase-v/, '')) {
    throw new ShowcaseError(tag, `manifest.json is the campaign of RESTest ${manifest.restest?.version}`);
  }
  if (!Array.isArray(manifest.apis)) throw new ShowcaseError(tag, 'manifest.json lists no APIs');
  for (const api of manifest.apis) {
    if (!SAFE.test(api?.id ?? '')) throw new ShowcaseError(tag, `manifest.json names an API "${api?.id}"`);
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
  if (!totals || !Array.isArray(operations)) throw new Error('has no totals or no operations');
  const found = (severity) =>
    new Set((report.faultsByOperation ?? []).filter((fault) => fault.severity === severity).map((fault) => fault.operation));
  const errors = found('error');
  const warnings = new Set([...found('warning')].filter((operation) => !errors.has(operation)));
  const tested = operations.filter((operation) => operation.state === 'tested').map((operation) => operation.operation);
  return {
    ...row,
    operations: operations.length,
    requests: totals.requests ?? 0,
    errors: totals.errors ?? 0,
    warnings: totals.warnings ?? 0,
    withErrors: errors.size,
    onlyWarnings: warnings.size,
    nothing: tested.filter((operation) => !errors.has(operation) && !warnings.has(operation)).length,
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

/** The five APIs with the most errors, most first. */
export function mostErrors(rows) {
  return rows
    .filter((row) => row.errors > 0)
    .sort((a, b) => b.errors - a.errors || a.id.localeCompare(b.id))
    .slice(0, 5);
}

/**
 * Everything the showcase shows, from its campaigns, put newest first. Each campaign is its tag, whether its
 * release has a file of a name, and a function giving the local path of one of its files, or null when it has
 * none; a campaign's files are asked for all at once. `publicDir` is emptied, then given the newest campaign's
 * report.html files, to be served by the site; an older campaign's rows link to theirs in its release.
 */
export async function buildShowcase(sources, { publicDir }) {
  rmSync(publicDir, { recursive: true, force: true });
  const built = [];
  const newestFirst = [...sources].sort((a, b) => newerFirst(a.tag, b.tag));
  for (const [index, { tag, has, file }] of newestFirst.entries()) {
    const read = async (name) => {
      const path = await file(name);
      if (!path) throw new ShowcaseError(tag, `the release has no ${name}, which its manifest names`);
      return path;
    };
    const readJson = async (name) => {
      const text = readFileSync(await read(name), 'utf8');
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new ShowcaseError(tag, `${name} cannot be read: ${error.message}`);
      }
    };
    const manifest = await readJson('manifest.json');
    checkManifest(tag, manifest);
    const version = manifest.restest.version;
    const newest = index === 0;
    const [reports, pages] = await Promise.all([
      Promise.all(manifest.apis.map((entry) => (entry.report ? readJson(entry.report) : null))),
      Promise.all(manifest.apis.map((entry) => (entry.page && newest ? read(entry.page) : null))),
    ]);
    const apis = manifest.apis.map((entry, at) => {
      let row;
      try {
        row = campaignRow(entry, reports[at]);
      } catch (error) {
        throw new ShowcaseError(tag, `${entry.report} ${error.message}`);
      }
      let page = null;
      if (pages[at]) {
        mkdirSync(join(publicDir, version), { recursive: true });
        copyFileSync(pages[at], join(publicDir, version, `${entry.id}.html`));
        page = `showcase/${version}/${entry.id}.html`;
      } else if (entry.page) {
        if (!has(entry.page)) throw new ShowcaseError(tag, `the release has no ${entry.page}, which its manifest names`);
        page = `https://github.com/${DATASET}/releases/download/${tag}/${entry.page}`;
      }
      return { ...row, page };
    });
    built.push({
      version,
      date: (manifest.startedAt ?? '').slice(0, 10),
      minutes: minutes(manifest.budget),
      runner: manifest.runner
        ? { label: manifest.runner.label, cpus: manifest.runner.cpus, memoryGiB: manifest.runner.memoryGiB }
        : null,
      apis,
      totals: campaignTotals(apis),
      mostErrors: mostErrors(apis),
    });
  }
  return { campaigns: built };
}
