// What the first page does in the browser: tabs, copying a command, bands that appear as they are reached,
// and the animation, paused by its button or while it is out of view. Without it the page shows everything.

/** Tabs, with the keyboard as well: the arrows, Home and End move between them, and the picked one shows. */
function tabs(group: HTMLElement): void {
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const pick = (picked: HTMLButtonElement, focus: boolean) => {
    for (const button of buttons) {
      const on = button === picked;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls') ?? '')?.classList.toggle('on', on);
    }
    if (focus) picked.focus();
  };
  for (const button of buttons) {
    button.addEventListener('click', () => pick(button, false));
    button.addEventListener('keydown', (event) => {
      const at = buttons.indexOf(button);
      const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: buttons.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      pick(buttons[(to + buttons.length) % buttons.length], true);
    });
  }
}

/** A command copied, and said to be, for a screen reader too. */
function copying(root: HTMLElement): void {
  const status = root.querySelector<HTMLElement>('[data-copied]');
  root.addEventListener('click', async (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-copy]');
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.dataset.copy ?? '');
      const label = button.querySelector('span');
      if (label) {
        label.textContent = 'Copied';
        setTimeout(() => (label.textContent = 'Copy'), 1600);
      }
      if (status) status.textContent = 'Copied to the clipboard';
    } catch {}
  });
}

/** Each band appears once it comes into view. */
function bands(): void {
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  document.querySelectorAll('.reveal').forEach((band) => seen.observe(band));
}

/** The animation runs while it is in view, unless its button paused it. */
function animation(): void {
  const away = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('away', !entry.isIntersecting);
  });
  document.querySelectorAll<HTMLElement>('.panel').forEach((panel) => {
    away.observe(panel);
    const button = panel.querySelector<HTMLButtonElement>('.live');
    button?.addEventListener('click', () => {
      const paused = panel.classList.toggle('paused');
      button.setAttribute('aria-pressed', String(paused));
      button.setAttribute('aria-label', paused ? 'Play the animation' : 'Pause the animation');
    });
  });
}

export function start(): void {
  document.querySelectorAll<HTMLElement>('[data-tabs]').forEach(tabs);
  document.querySelectorAll<HTMLElement>('.install').forEach(copying);
  bands();
  animation();
}
