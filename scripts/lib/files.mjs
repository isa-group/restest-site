// Writing the files the build reads, for the scripts that copy RESTest's documentation and read the showcase.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Writes a file, making its folders first. */
export function write(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}
