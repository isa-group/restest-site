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
  operations: number;
  requests: number;
  errors: number;
  operationsWithErrors: number;
  warnings: number;
  operationsWithWarnings: number;
  faults: LandingFault[];
}
