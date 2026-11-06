// The run RESTest's manual keeps, as the site's first page shows it: its figures, and one fault of each kind.

/** Where RESTest keeps the run: its report.json, and pictures of its report.html. */
export const RUN = 'docs/manual/images/clinic-run';

/** The three views of report.html the first page shows, each in a light and a dark picture. */
export const VIEWS = ['summary', 'fault', 'found'];

export const PICTURES = VIEWS.flatMap((view) => [`${view}-light.png`, `${view}-dark.png`]);

/** The most characters a fault's sentence may take on the page, whose card has room for two lines. */
const LONGEST = 150;

/**
 * What the first page shows of a run, from its report.json: the version that made it, its four counts
 * and on how many operations, and one written fault of each kind, the kinds in the order report.html's
 * "What was found" gives them, errors first, then by how often they were found. Each fault is worded as
 * report.html shows it when its operation is opened: the finding's sentence, with a capital. A kind the
 * report counted without writing one out is left out; a fault that got no reply has no status.
 */
export function landingRun(report) {
  const operations = new Map((report.operations ?? []).map((operation) => [operation.operation, operation]));
  const kinds = [...(report.faultsByCategory ?? [])].sort(
    (a, b) => rank(a) - rank(b) || (b.count ?? 0) - (a.count ?? 0),
  );
  const faults = [];
  for (const kind of kinds) {
    const found = (report.findings ?? []).find((finding) => finding.category?.code === kind.code);
    if (!found) continue;
    const operation = operations.get(found.operation);
    faults.push({
      severity: kind.severity,
      title: kind.title,
      code: `F${kind.code}`,
      method: operation?.method ?? null,
      path: operation?.path ?? null,
      status: Number.isInteger(found.status) ? found.status : null,
      summary: capital(clean(found.summary)),
    });
  }
  const totals = report.totals ?? {};
  return {
    version: report.tool?.version ?? null,
    title: report.api?.title ?? null,
    operations: (report.operations ?? []).length,
    requests: totals.requests ?? 0,
    errors: totals.errors ?? 0,
    operationsWithErrors: totals.operationsWithErrors ?? 0,
    warnings: totals.warnings ?? 0,
    operationsWithWarnings: totals.operationsWithWarnings ?? 0,
    faults,
  };
}

const rank = (kind) => (kind.severity === 'error' ? 0 : 1);

const capital = (text) => (text ? text[0].toUpperCase() + text.slice(1) : text);

/** On one line, with no character that draws nothing, and cut short when the card has no room for it. */
function clean(text) {
  const flat = String(text ?? '').replace(/[\p{Cc}\p{Cf}\s]+/gu, ' ').trim();
  return flat.length > LONGEST ? `${flat.slice(0, LONGEST - 1).trimEnd()}…` : flat;
}
