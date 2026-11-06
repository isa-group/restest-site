// Copies RESTest's documentation, at the version the site publishes, into the places Astro builds from.
//
//   node scripts/sync-docs.mjs                 the version in restest-version
//   node scripts/sync-docs.mjs --ref master    another tag or branch, such as master for the weekly check
//   node scripts/sync-docs.mjs --from ../RESTest   a copy on this machine, to preview pages not yet released
//
// It writes, all of it ignored by git: the pages in src/content/docs/docs/, the images they use in
// public/source/, the sidebar in src/generated/sidebar.json and public/llms.txt. It fails, naming the
// file in RESTest, on anything the site cannot be built from: a page with no title, a link to nothing,
// an index that lists no page. For the first page it writes src/generated/landing.json: the version the site
// publishes and, when the version keeps the run its manual pictures, what it shows of that run, whose
// pictures it copies into src/generated/clinic-run/.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { base, repository } from '../site.config.mjs';
import { createResolver } from './lib/links.mjs';
import { llmsTxt } from './lib/llms.mjs';
import { landingRun, PICTURES, RUN } from './lib/landing-run.mjs';
import { DocumentationError } from './lib/markdown.mjs';
import { addressPages, buildPage } from './lib/pages.mjs';
import { isRefName, isRelease } from './lib/refs.mjs';
import { DOCS_INDEX, MANUAL_INDEX, buildOutline, readManual, readSections, starlightSidebar } from './lib/sidebar.mjs';

const site = fileURLToPath(new URL('..', import.meta.url));

function main() {
  const { values } = parseArgs({ options: { ref: { type: 'string' }, from: { type: 'string' } } });
  const published = publishedVersion();
  const ref = values.ref ?? (values.from ? 'master' : published);
  if (!isRefName(ref)) fail(`--ref ${ref} is not the name of a tag or a branch`);
  const source = values.from ? resolve(values.from) : clone(ref);
  const badge = values.from ? 'local' : ref;
  const describes = isRelease(ref) ? `RESTest ${ref.slice(1)}` : `RESTest at ${ref}`;

  // A copy on this machine may have pages not yet added to git; a fetched one has only what git holds.
  const listed = values.from ? ['ls-files', '--cached', '--others', '--exclude-standard'] : ['ls-files'];
  const files = new Set(git(source, ...listed).split('\n').filter(Boolean));
  const slugs = addressPages([...files]);
  const resolveLink = createResolver({ slugs, files, ref, base, repository });
  const plain = (path) => {
    const file = join(source, path);
    if (!existsSync(file)) throw new DocumentationError(path, 'is not in this copy of RESTest');
    if (!lstatSync(file).isFile()) throw new DocumentationError(path, 'is not a plain file');
    return file;
  };
  const read = (path) => readFileSync(plain(path), 'utf8');

  const content = join(site, 'src/content/docs/docs');
  const images = join(site, 'public/source');
  const generated = join(site, 'src/generated');
  for (const dir of [content, images, generated]) rmSync(dir, { recursive: true, force: true });

  let overviewTitle;
  const used = new Set();
  for (const [path, slug] of slugs) {
    const page = buildPage(path, read(path), { resolve: resolveLink, editBase: `${repository}/edit/master` });
    if (path === DOCS_INDEX) overviewTitle = page.title;
    page.images.forEach((image) => used.add(image));
    // Every address starts with docs/; Astro builds a page from the index.md of its folder.
    write(join(content, slug.replace(/^docs\/?/, ''), 'index.md'), page.text);
  }
  for (const image of used) {
    mkdirSync(dirname(join(images, image)), { recursive: true });
    copyFileSync(plain(image), join(images, image));
  }

  const outline = buildOutline({
    manual: readManual(read(MANUAL_INDEX)),
    sections: readSections(read(DOCS_INDEX)),
    slugs,
    resolve: resolveLink,
  });
  write(join(generated, 'sidebar.json'), `${JSON.stringify(starlightSidebar(outline, badge), null, 2)}\n`);
  write(join(site, 'public/llms.txt'), llmsTxt(outline, {
    describes,
    raw: `${repository.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/${ref}`,
    overviewTitle,
  }));
  // What the first page shows: the version the site publishes, which its Docker command installs, and the run
  // of a version that keeps one, or null.
  const kept = files.has(`${RUN}/report.json`);
  const run = kept ? landingRun(JSON.parse(read(`${RUN}/report.json`))) : null;
  write(join(generated, 'landing.json'), `${JSON.stringify({ version: published.slice(1), run }, null, 2)}\n`);
  if (kept) {
    mkdirSync(join(generated, 'clinic-run'), { recursive: true });
    for (const picture of PICTURES) copyFileSync(plain(`${RUN}/${picture}`), join(generated, 'clinic-run', picture));
  }
  console.log(`Copied ${slugs.size} pages and ${used.size} images of ${describes}${kept ? ', and the run its first page shows' : ''}${values.from ? `, from ${source}` : ''}`);
}

/** The version the site publishes: the one line of restest-version, which RESTest writes on a release. */
function publishedVersion() {
  const version = readFileSync(join(site, 'restest-version'), 'utf8').trim();
  if (!isRelease(version)) fail(`restest-version holds "${version}", not a version such as v2.4.0`);
  return version;
}

/** A shallow copy of RESTest at that tag or branch, in .restest/, kept between runs: a later run fetches
 * only what changed, and the checkout replaces every file it holds. */
function clone(ref) {
  const dest = join(site, '.restest', ref.replaceAll('/', '_'));
  mkdirSync(dest, { recursive: true });
  git(dest, 'init', '--quiet');
  git(dest, 'fetch', '--quiet', '--depth', '1', `${repository}.git`, ref);
  git(dest, '-c', 'advice.detachedHead=false', 'checkout', '--quiet', '--force', 'FETCH_HEAD');
  return dest;
}

function git(dir, ...args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
}

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function fail(message) {
  console.error(`sync-docs: ${message}`);
  process.exit(1);
}

try {
  main();
} catch (error) {
  if (!(error instanceof DocumentationError)) throw error;
  fail(error.message);
}
