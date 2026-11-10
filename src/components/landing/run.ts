// What the first page shows of the run RESTest's manual keeps, as scripts/lib/landing-run.mjs writes it.

export interface LandingFault {
  severity: 'error' | 'warning';
  title: string;
  code: string;
  method: string | null;
  path: string | null;
  status: number | null;
  summary: string;
}

export interface LandingRun {
  version: string | null;
  title: string | null;
  minutes: number | null;
  operations: number;
  requests: number;
  errors: number;
  operationsWithErrors: number;
  warnings: number;
  operationsWithWarnings: number;
  faults: LandingFault[];
}

/** What scripts/sync-docs.mjs writes for the first page: the version the site publishes, the sentence for a
 * coding agent, and the run. */
export interface Landing {
  version: string;
  prompt: string | null;
  run: LandingRun | null;
}

/** A run's length in words: "30 seconds", "a minute", "5 minutes", "an hour", "2 hours", "90 minutes". */
export function minutesInWords(minutes: number | null): string {
  if (!minutes) return 'its budget';
  if (minutes < 1) return `${Math.round(minutes * 60)} seconds`;
  if (minutes === 1) return 'a minute';
  if (minutes === 60) return 'an hour';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}
