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

/** The run's length in words: "a minute", "5 minutes". */
export const minutesInWords = (minutes: number | null) =>
  minutes === 1 ? 'a minute' : minutes ? `${minutes} minutes` : 'its budget';
