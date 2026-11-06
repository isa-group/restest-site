# RESTest site

The site of [RESTest](https://github.com/isa-group/RESTest), the black-box testing tool for REST
APIs. It will hold three parts, each added in a pull request of its own:

- `/docs`, the documentation, built from RESTest's own files at a released version;
- `/`, the landing page: what RESTest is, and how to start;
- `/showcase`, what RESTest finds on real APIs.

The documentation is built; the landing page and the showcase are not yet, and `/` leads to `/docs/`
until the landing page exists. The site is built with [Astro](https://astro.build) and the
documentation with [Starlight](https://starlight.astro.build), and both are published on GitHub Pages.

## Building it

With Node 26 (`.nvmrc`):

```bash
npm ci
npm test            # the step that copies RESTest's documentation, tested on its own
npm run build       # the site, in dist/
npm run preview     # dist/ served at http://localhost:4321/restest-site/
npm run dev         # or the site served as it is edited
```

`npm run build` and `npm run dev` first copy the documentation of the version in `restest-version`.
To build from another version, or from a copy of RESTest on your machine:

```bash
npm run sync -- --ref master && npx astro build
npm run sync -- --from ../RESTest && npx astro dev
```

## The documentation

Nothing in RESTest is changed for the site, and nothing of RESTest is committed here. Before each
build, [`scripts/sync-docs.mjs`](scripts/sync-docs.mjs) takes RESTest at the version in
[`restest-version`](restest-version). Its pages are the Markdown in `docs/` and three files RESTest's
`AGENTS.md` names, `README.md`, `AGENTS.md` and `CONTRIBUTING.md`; of the rest of RESTest it copies only
the images those pages show, and checks that what else they link to exists. Pages are read as RESTest
writes them, with no front matter and no smart punctuation: `--auth` stays `--auth`. It writes, all of
it ignored by git:

- **every page** into `src/content/docs/docs/`, as RESTest has it but for three things: the title is
  taken from the first `#` line into the page's front matter, RESTest's logo at the top of the README
  goes (the site's header shows it), and every link is pointed at the site. A link to another page
  leads to that page, `../faults.md#errors` to `/docs/faults/#errors`; a link to an image leads to its
  copy in `public/source/`; a link to any other file of RESTest, such as `LICENSE`, leads to it on
  GitHub at that version. A picture with a light and a dark version follows the theme picked on the
  site;
- **the sidebar** into `src/generated/sidebar.json`, read from the two indexes of the documentation:
  the chapters of the numbered list in `docs/manual/README.md`, then a group for each `##` section of
  `docs/README.md`, with an entry for each row of its table;
- **`public/llms.txt`**, the same outline for coding agents, each page linked as its Markdown at that
  version, with the description its index gives it.

Addresses: `docs/faults.md` is at `/docs/faults/`, a chapter of the manual without its number
(`docs/manual/03-a-first-run.md` at `/docs/manual/a-first-run/`), a folder's `README.md` at the
folder's address, and `README.md`, `AGENTS.md` and `CONTRIBUTING.md` at `/docs/readme/`, `/docs/agents/`
and `/docs/contributing/`.

The build fails, naming the file in RESTest, when a page has no title or front matter of its own, when
two files would be published at one address, when a link leads to nothing in that version of RESTest,
when an index has lost the shape the sidebar is read from, or when a page is in neither index — all but
the README, the two indexes and the decision records, which their own index lists. Once the pages are
built, [starlight-links-validator](https://github.com/HiDeoo/starlight-links-validator) checks that
every link between them leads to a page and a heading that exist; it names the page by its address on
the site, `docs/manual/settings.md` for RESTest's `docs/manual/07-settings.md`, and counts lines in the
copy, whose first lines are the front matter.

A code block marked `mermaid` is drawn as a diagram, as GitHub draws it.
[`src/markdown/mermaid.mjs`](src/markdown/mermaid.mjs) turns the block into the diagram's text, and
[`src/components/MarkdownContent.astro`](src/components/MarkdownContent.astro) has
[Mermaid](https://mermaid.js.org) draw it in the browser, loaded only on a page that has a diagram. A
diagram that sets its own colours keeps them in both themes, and any other follows the theme; one wider
than the text is drawn smaller to fit it, and a click shows it at its own size. Without JavaScript, the
diagram's text is shown.

### When it is rebuilt

[`.github/workflows/site.yml`](.github/workflows/site.yml) builds the site on every pull request and
publishes it on every push to `main`. When RESTest publishes a release, its workflow
[`documentation-site.yml`](https://github.com/isa-group/RESTest/blob/master/.github/workflows/documentation-site.yml)
writes the version into `restest-version`, with a deploy key of this repository, so that the commit
publishes the documentation of the new version; it then waits until `llms.txt` names that version, in
its opening sentence. The file is never put back to an earlier version: if a release's pages do not
build, the site is changed until they do.
Every Monday the site is also built from RESTest's `master`, without publishing it, to say that it
still builds from what the next version will be.

## The look

- [`src/styles/tokens.css`](src/styles/tokens.css) — the colours, light and dark, the three
  typefaces, the smallest size text may take and the radius of corners, with comments saying what
  each is for. Every part of the site takes its colours, type and corners from this file.
- [`src/styles/docs.css`](src/styles/docs.css) — the documentation in that look: Starlight's own
  colours and sizes, taken from the tokens, and the sidebar, titles and "On this page" as the site's
  mock-up drew them. On a wide screen the menu, the text and "On this page" stand together in the
  middle of the window, with the header lined up on them.
- [`src/components/ThemeSelect.astro`](src/components/ThemeSelect.astro) — the colour theme in one
  click, with three buttons, following the system, light and dark, in place of Starlight's drop-down;
  in the header, on a phone too.
- [`src/assets/logo.svg`](src/assets/logo.svg) and [`src/assets/logo-dark.svg`](src/assets/logo-dark.svg)
  — RESTest's logo, for light and dark backgrounds, with the check in the accent colour. Being images, they
  cannot read `tokens.css`: they repeat its `--rt-text` and `--rt-accent` by value, and change with them.
  [`public/favicon.svg`](public/favicon.svg) is the check alone.
- [`src/assets/fonts/`](src/assets/fonts) — Space Grotesk, JetBrains Mono and Sora, served by the site
  itself rather than by a font service, each beside its licence, the SIL Open Font License 1.1. They
  are the variable, Latin files of Fontsource 5.3.0 (`@fontsource-variable/space-grotesk`,
  `jetbrains-mono` and `sora`); characters outside Latin, such as arrows, are drawn by the system's
  fonts.

## License

Apache License, Version 2.0. See [LICENSE](LICENSE). The typefaces in `src/assets/fonts/` keep their
own licence, the SIL Open Font License 1.1, in the file beside each.
