// Reads the showcase's campaigns, the releases isa-group/restest-dataset publishes, into the places Astro builds
// from. Run after sync-docs.mjs, which empties src/generated/.
//
//   node scripts/sync-showcase.mjs                     every published campaign
//   node scripts/sync-showcase.mjs --from <folder>...  campaigns from folders holding a release's files, to
//                                                      preview one not published yet, such as a draft
//
// It writes, all of it ignored by git, src/generated/showcase.json, what the showcase and the first page's
// band show, and the newest campaign's report.html files in public/showcase/<version>/. A release's files
// are kept in .restest/showcase/ between runs, each under the id GitHub gives it, so that a file replaced in
// a release is fetched again. It fails, naming the release and the file, on anything the site cannot be built
// from. GITHUB_TOKEN, when set, is sent to GitHub's API alone, to list the releases.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildShowcase, campaigns, DATASET, isCampaignTag, newerFirst, ShowcaseError } from './lib/showcase.mjs';

const site = fileURLToPath(new URL('..', import.meta.url));
const TRIES = 3;

async function main() {
  const { values } = parseArgs({ options: { from: { type: 'string', multiple: true } } });
  const sources = values.from ? values.from.map(local).sort((a, b) => newerFirst(a.tag, b.tag)) : await published();
  const publicDir = join(site, 'public/showcase');
  rmSync(publicDir, { recursive: true, force: true });
  const showcase = await buildShowcase(sources, { publicDir });
  write(join(site, 'src/generated/showcase.json'), `${JSON.stringify(showcase, null, 2)}\n`);
  const said = showcase.campaigns.map((c, i) => `${c.version} (${c.apis.length} APIs${i === 0 ? ', their reports served' : ''})`);
  console.log(said.length ? `Read the showcase's campaigns: ${said.join(', ')}` : 'No campaign is published yet');
}

/** A campaign in a folder on this machine, its tag read from its manifest. */
function local(folder) {
  const dir = resolve(folder);
  const manifest = join(dir, 'manifest.json');
  if (!existsSync(manifest)) throw new ShowcaseError(`${folder} holds no manifest.json`);
  const tag = `showcase-v${JSON.parse(readFileSync(manifest, 'utf8')).restest?.version}`;
  if (!isCampaignTag(tag)) throw new ShowcaseError(`${folder}: manifest.json names no version such as 2.5.0`);
  return { tag, file: (name) => (existsSync(join(dir, name)) ? join(dir, name) : null) };
}

/** The published campaigns, newest first, each fetching a file of its release only when it is asked for. */
async function published() {
  const releases = [];
  for (let page = 1; ; page++) {
    const batch = await json(`https://api.github.com/repos/${DATASET}/releases?per_page=100&page=${page}`);
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  return campaigns(releases).map((release) => {
    const assets = new Map(release.assets.map((asset) => [asset.name, asset]));
    return {
      tag: release.tag_name,
      file: async (name) => {
        const asset = assets.get(name);
        if (!asset) return null;
        const kept = join(site, '.restest/showcase', release.tag_name, `${asset.id}-${name}`);
        if (!existsSync(kept)) write(kept, await download(asset.browser_download_url));
        return kept;
      },
    };
  });
}

/** GitHub's API, with the token when there is one. */
async function json(url) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return JSON.parse((await fetchTrying(url, headers)).toString('utf8'));
}

/** A release's file, from its public address: no token is sent with it. */
function download(url) {
  return fetchTrying(url, {});
}

/** The body of a GET, tried three times, a second apart, before the build stops naming the address. */
async function fetchTrying(url, headers) {
  let last;
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    try {
      const reply = await fetch(url, { headers });
      if (reply.ok) return Buffer.from(await reply.arrayBuffer());
      last = `answered ${reply.status}`;
      if (reply.status < 500 && reply.status !== 429) break;
    } catch (error) {
      last = error.message;
    }
    await new Promise((done) => setTimeout(done, 1000 * attempt));
  }
  throw new ShowcaseError(`${url.replace(/\?.*/, '')} ${last}`);
}

function write(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof ShowcaseError)) throw error;
  console.error(`sync-showcase: ${error.message}`);
  process.exit(1);
}
