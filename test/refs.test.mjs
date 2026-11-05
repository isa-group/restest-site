import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRefName, isRelease } from '../scripts/lib/refs.mjs';

test('restest-version holds a released version and nothing else', () => {
  assert.ok(isRelease('v2.4.0'));
  for (const not of ['2.4.0', 'v2.4', 'v2.4.0-rc1', 'master', ' v2.4.0']) assert.ok(!isRelease(not), not);
});

test('a tag or a branch is accepted only as a plain name, never as an option or a path upwards', () => {
  for (const name of ['v2.4.0', 'master', 'release/2.5']) assert.ok(isRefName(name), name);
  for (const not of ['-x', '--upload-pack=x', 'a..b', 'a:b', 'a b', 'a;b', '']) assert.ok(!isRefName(not), not);
});
