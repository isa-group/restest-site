import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  buildShowcase,
  campaignRow,
  campaignTotals,
  campaigns,
  checkManifest,
  localCampaign,
  mostErrors,
  ShowcaseError,
} from '../scripts/lib/showcase.mjs';
import { minutes } from '../scripts/lib/landing-run.mjs';
import { minutesInWords } from '../src/components/landing/run.ts';

const release = (tag, extra = {}) => ({ tag_name: tag, draft: false, prerelease: false, ...extra });

test('only published campaigns, the newest version first, whenever each was published', () => {
  const listed = [
    release('showcase-v2.6.0'),
    release('showcase-v2.5.1'),
    release('showcase-v2.10.0'),
    release('showcase-v2.4.0', { draft: true }),
    release('showcase-v2.7.0-rc1'),
    release('showcase-v2.7.0', { prerelease: true }),
    release('v2.5.0'),
  ];

  assert.deepEqual(campaigns(listed).map((r) => r.tag_name), ['showcase-v2.10.0', 'showcase-v2.6.0', 'showcase-v2.5.1']);
});

test('a manifest of another format, another version or an unsafe name stops the build, naming the release', () => {
  const manifest = { format: 1, restest: { version: '2.5.0' }, apis: [{ id: 'petclinic-rest' }] };
  checkManifest('showcase-v2.5.0', manifest);

  assert.throws(() => checkManifest('showcase-v2.5.0', { ...manifest, format: 2 }), /^ShowcaseError: showcase-v2\.5\.0: .*format 2/);
  assert.throws(() => checkManifest('showcase-v2.6.0', manifest), /campaign of RESTest 2\.5\.0/);
  assert.throws(() => checkManifest('showcase-v2.5.0', { ...manifest, apis: [{ id: '../index' }] }), ShowcaseError);
  assert.throws(() => checkManifest('showcase-v2.5.0', { ...manifest, apis: undefined }), /lists no APIs/);
});

const report = {
  totals: { requests: 1200, errors: 30, warnings: 400 },
  operations: [
    { operation: 'getOwner', state: 'tested' },
    { operation: 'addOwner', state: 'tested' },
    { operation: 'listPets', state: 'tested' },
    { operation: 'health', state: 'tested' },
    { operation: 'logout', state: 'leftAloneByThePlan' },
    { operation: 'deep', state: 'notReached' },
    { operation: 'upload', state: 'couldNotBeTested' },
  ],
  faultsByOperation: [
    { operation: 'getOwner', severity: 'error' },
    { operation: 'getOwner', severity: 'warning' },
    { operation: 'addOwner', severity: 'warning' },
    { operation: 'addOwner', severity: 'warning' },
  ],
};

test("an API's row counts each operation once: errors first, then only warnings, then nothing, then not tested", () => {
  const row = campaignRow({ id: 'clinic', title: 'Clinic', outcome: 'ran' }, report);

  assert.deepEqual(row, {
    id: 'clinic', title: 'Clinic', outcome: 'ran', reason: null,
    operations: 7, requests: 1200, errors: 30, warnings: 400,
    withErrors: 1, onlyWarnings: 1, nothing: 2, notTested: 3,
  });
});

test('an API without a report says what became of it; a report without totals stops the build', () => {
  assert.deepEqual(campaignRow({ id: 'slow', title: 'Slow', outcome: 'apiDidNotStart', reason: 'did not answer' }, null), {
    id: 'slow', title: 'Slow', outcome: 'apiDidNotStart', reason: 'did not answer',
  });
  assert.throws(() => campaignRow({ id: 'x', title: 'X', outcome: 'ran' }, { operations: [] }), /no totals/);
});

test("a campaign's figures, and its APIs with the most errors", () => {
  const rows = [
    { id: 'a', errors: 5, requests: 10, warnings: 1 },
    { id: 'b', errors: 0, requests: 20, warnings: 2 },
    { id: 'c', errors: 9, requests: 30, warnings: 3 },
    { id: 'd', outcome: 'apiDidNotStart' },
  ];

  assert.deepEqual(campaignTotals(rows), { apis: 4, requests: 60, errors: 14, warnings: 6, apisWithErrors: 2 });
  assert.deepEqual(mostErrors(rows).map((row) => row.id), ['c', 'a']);
});

test('a budget in words, as both bands of the first page say it', () => {
  const words = (budget) => minutesInWords(minutes(budget));

  assert.deepEqual(
    ['PT1M', 'PT15M', 'PT1H', 'PT1H30M', 'PT2H', 'PT30S', undefined].map(words),
    ['a minute', '15 minutes', 'an hour', '90 minutes', '2 hours', '30 seconds', 'its budget'],
  );
});

/** A campaign as its release holds it: a manifest, and each API's report.json and report.html. */
function campaignFolder(root, version, apis) {
  const folder = join(root, version);
  mkdirSync(folder, { recursive: true });
  const entries = apis.map(({ id, ran = true, page = true }) => {
    if (ran) {
      writeFileSync(join(folder, `${id}.report.json`), JSON.stringify(report));
      if (page) writeFileSync(join(folder, `${id}.report.html`), `<html>${id} ${version}</html>`);
    }
    return {
      id, title: id.toUpperCase(), outcome: ran ? 'ran' : 'apiDidNotStart', reason: ran ? null : 'did not answer',
      report: ran ? `${id}.report.json` : null, page: ran && page ? `${id}.report.html` : null,
    };
  });
  writeFileSync(join(folder, 'manifest.json'), JSON.stringify({
    format: 1, restest: { version }, budget: 'PT15M', startedAt: '2026-11-20T10:00:00Z',
    runner: { label: 'ubuntu-24.04', cpus: 4, memoryGiB: 16, freeDiskGiB: 80 }, apis: entries,
  }));
  return localCampaign(folder);
}

test("the newest campaign's reports are served by the site, and an older one's rows link to its release", async () => {
  const root = mkdtempSync(join(tmpdir(), 'showcase-'));
  try {
    const sources = [
      campaignFolder(root, '2.6.0', [{ id: 'clinic' }, { id: 'slow', ran: false }, { id: 'bare', page: false }]),
      campaignFolder(root, '2.5.0', [{ id: 'clinic' }]),
    ];
    const publicDir = join(root, 'public');

    const { campaigns: built } = await buildShowcase(sources, { publicDir });

    assert.deepEqual(built.map((campaign) => campaign.version), ['2.6.0', '2.5.0']);
    const [newest, older] = built;
    assert.equal(newest.minutes, 15);
    assert.deepEqual(newest.totals, { apis: 3, requests: 2400, errors: 60, warnings: 800, apisWithErrors: 2 });
    assert.deepEqual(newest.apis.map((api) => api.page), ['showcase/2.6.0/clinic.html', null, null]);
    assert.equal(newest.apis[1].outcome, 'apiDidNotStart');
    assert.equal(newest.apis[2].errors, 30);
    assert.equal(older.apis[0].page, 'https://github.com/isa-group/restest-dataset/releases/download/showcase-v2.5.0/clinic.report.html');
    assert.deepEqual(newest.mostErrors.map((row) => row.id), ['bare', 'clinic']);
    assert.deepEqual(readdirSync(publicDir), ['2.6.0']);
    assert.deepEqual(readdirSync(join(publicDir, '2.6.0')), ['clinic.html']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a folder without a manifest, or whose manifest names no version, is no campaign', () => {
  const root = mkdtempSync(join(tmpdir(), 'showcase-'));
  try {
    assert.throws(() => localCampaign(root), /holds no manifest\.json/);
    writeFileSync(join(root, 'manifest.json'), JSON.stringify({ format: 1, restest: { version: 'master' } }));
    assert.throws(() => localCampaign(root), /names no version/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a file the manifest names and the release lacks stops the build, naming both', async () => {
  const root = mkdtempSync(join(tmpdir(), 'showcase-'));
  try {
    const source = campaignFolder(root, '2.6.0', [{ id: 'clinic' }]);
    rmSync(join(root, '2.6.0', 'clinic.report.json'));

    await assert.rejects(buildShowcase([source], { publicDir: join(root, 'public') }), /showcase-v2\.6\.0: the release has no clinic\.report\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
