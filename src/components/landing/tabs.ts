// The attributes that tie a tab to its panel, for the first page's two sets of tabs; page.ts picks between them.

/** A tab's button: the first is picked, and the only one the Tab key reaches. */
export const tab = (prefix: string, id: string, picked: boolean) => ({
  type: 'button' as const,
  role: 'tab',
  id: `${prefix}-${id}`,
  'aria-controls': `${prefix}-${id}-panel`,
  'aria-selected': String(picked),
  tabindex: picked ? 0 : -1,
});

/** A tab's panel, marked `on` while its tab is picked. */
export const panel = (prefix: string, id: string, picked: boolean) => ({
  role: 'tabpanel',
  id: `${prefix}-${id}-panel`,
  'aria-labelledby': `${prefix}-${id}`,
  class: picked ? 'on' : undefined,
});
