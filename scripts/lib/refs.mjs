// The versions of RESTest the site can be built from.

/** A released version, such as `v2.4.0`: what `restest-version` holds. */
export function isRelease(ref) {
  return /^v\d+\.\d+\.\d+$/.test(ref);
}

/**
 * A tag or a branch, such as `v2.4.0` or `master`, given to git as an argument and used in addresses on
 * GitHub: letters, digits and `.`, `_`, `/`, `-`, never starting with `-` and never holding `..`.
 */
export function isRefName(ref) {
  return /^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]+$/.test(ref);
}
