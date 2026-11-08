// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { satteri } from '@astrojs/markdown-satteri';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightLinksValidator from 'starlight-links-validator';
import { base, repository, site } from './site.config.mjs';
import { mermaidDiagrams } from './src/markdown/mermaid.mjs';

// The sidebar is read from RESTest's two indexes by scripts/sync-docs.mjs, which `npm run build` and
// `npm run dev` run first.
const sidebarFile = new URL('./src/generated/sidebar.json', import.meta.url);
if (!existsSync(sidebarFile)) {
  throw new Error('src/generated/sidebar.json is missing: run `npm run sync` first, or `npm run build`');
}
const sidebar = JSON.parse(readFileSync(sidebarFile, 'utf8'));

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  // RESTest's pages are shown as written. Astro's smart punctuation would turn the option `--auth` into
  // `–auth`, and straight quotes into curly ones, which GitHub never does. A Mermaid diagram is drawn, as
  // GitHub draws it, rather than shown as code.
  markdown: { processor: satteri({ features: { smartPunctuation: false }, mdastPlugins: [mermaidDiagrams] }) },
  integrations: [
    starlight({
      title: 'RESTest',
      description: 'The documentation of RESTest, a black-box testing tool for REST APIs.',
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', replacesTitle: true },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'RESTest on GitHub', href: repository }],
      customCss: ['./src/styles/tokens.css', './src/styles/docs.css'],
      components: {
        // The theme in one click, with three buttons, rather than in Starlight's drop-down.
        ThemeSelect: './src/components/ThemeSelect.astro',
        // A page's text, with its Mermaid diagrams drawn.
        MarkdownContent: './src/components/MarkdownContent.astro',
        // The showcase beside the link to GitHub, when a campaign is published.
        SocialIcons: './src/components/SocialIcons.astro',
      },
      sidebar,
      pagination: false,
      expressiveCode: {
        styleOverrides: {
          codeFontFamily: 'var(--rt-font-mono)',
          codeFontSize: 'var(--rt-text-min)',
          uiFontFamily: 'var(--rt-font-sans)',
          uiFontSize: 'var(--rt-text-min)',
          borderRadius: 'var(--rt-radius)',
          borderColor: 'var(--rt-line)',
        },
        // Starlight gives code blocks the colours of its own surfaces after these overrides are read, so
        // the background of code, and of the bar above it, is set on the theme itself, after Starlight.
        customizeTheme(theme) {
          const code = 'var(--rt-code-bg)';
          theme.styleOverrides.frames = {
            ...theme.styleOverrides.frames,
            editorBackground: code,
            terminalBackground: code,
            editorActiveTabBackground: code,
            editorTabBarBackground: code,
            terminalTitlebarBackground: code,
          };
          return theme;
        },
      },
      plugins: [starlightLinksValidator()],
    }),
  ],
});
