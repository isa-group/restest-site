// The first page's small icons, drawn in the colour of the text around them and hidden from screen readers.

const icon = (size: number, body: string) =>
  `<svg viewBox="0 0 16 16" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;

export const arrowIcon = icon(
  14,
  '<path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
);

export const copyIcon = icon(
  15,
  '<rect x="5" y="5" width="9" height="9" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M11 5V3.8A1.8 1.8 0 0 0 9.2 2H3.8A1.8 1.8 0 0 0 2 3.8v5.4A1.8 1.8 0 0 0 3.8 11H5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
);

export const githubIcon = icon(
  16,
  '<path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/>',
);
