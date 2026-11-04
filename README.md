# RESTest site

The site of [RESTest](https://github.com/isa-group/RESTest), the black-box testing tool for REST
APIs. It will hold three parts, each added in a pull request of its own:

- `/`, the landing page: what RESTest is, and how to start;
- `/docs`, the documentation, built from RESTest's `docs/` at its latest release;
- `/showcase`, what RESTest finds on real APIs.

None of them is built yet. What the repository holds today is the look the three will share.

## The look

- [`src/styles/tokens.css`](src/styles/tokens.css) — the colours, light and dark, the three
  typefaces, the smallest size text may take and the radius of corners, with comments saying what
  each is for. Every part of the site takes its colours, type and corners from this file.
- [`src/assets/logo.svg`](src/assets/logo.svg) and [`src/assets/logo-dark.svg`](src/assets/logo-dark.svg)
  — RESTest's logo, for light and dark backgrounds, with the check in the accent colour. Being images, they
  cannot read `tokens.css`: they repeat its `--rt-text` and `--rt-accent` by value, and change with them.
- [`src/assets/fonts/`](src/assets/fonts) — Space Grotesk, JetBrains Mono and Sora, served by the site
  itself rather than by a font service, each beside its licence, the SIL Open Font License 1.1. They
  are the variable, Latin files of Fontsource 5.3.0 (`@fontsource-variable/space-grotesk`,
  `jetbrains-mono` and `sora`); characters outside Latin, such as arrows, are drawn by the system's
  fonts.

## License

Apache License, Version 2.0. See [LICENSE](LICENSE). The typefaces in `src/assets/fonts/` keep their
own licence, the SIL Open Font License 1.1, in the file beside each.
