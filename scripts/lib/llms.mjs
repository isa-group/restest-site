// /llms.txt: the documentation as a list a coding agent can read, in the format of llmstxt.org.

/**
 * A heading, a line saying which version of RESTest the documentation is of, then a section per group of
 * the sidebar, each page linked as its Markdown in that version — which an agent reads more easily than
 * the page around it — with the description its index gives it.
 */
export function llmsTxt(outline, { describes, raw, overviewTitle }) {
  const link = (label, path, description) => `- [${label}](${raw}/${path})${description ? `: ${description}` : ''}`;
  const lines = [
    '# RESTest',
    '',
    // RESTest's workflow documentation-site.yml, once it has written a release into restest-version, waits
    // for this sentence to name it, "The documentation of RESTest 2.5.0,": change the two together.
    `> The documentation of ${describes}, a black-box testing tool for REST APIs: a manual to read from the beginning, and one page per subject to look things up in. Each link is a page's Markdown in that version.`,
    '',
    link(overviewTitle, outline.overview.path, 'every page, and what it covers'),
  ];
  for (const group of outline.groups) {
    lines.push('', `## ${group.label}`, '');
    for (const entry of group.entries) lines.push(link(entry.label, entry.path, entry.description));
  }
  return `${lines.join('\n')}\n`;
}
