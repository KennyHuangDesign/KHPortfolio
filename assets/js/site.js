/* Kenny Huang portfolio: shared behaviour for every page
   1. Light/dark toggle, saved in localStorage under "theme".
   2. Reveal-on-scroll fallback for browsers without CSS scroll-driven animations (Safari, Firefox):
      adds .io to <html>, then .in to each [data-reveal] element as it comes into view. */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Theme toggle
  const toggle = document.querySelector('[data-theme-toggle]');
  const savedTheme = () => { try { return localStorage.getItem('theme'); } catch (e) { return null; } };
  const syncToggle = () => {
    if (!toggle) return;
    const dark = root.classList.contains('dark');
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  };
  if (toggle) {
    toggle.addEventListener('click', () => {
      const dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) { /* storage blocked */ }
      syncToggle();
    });
  }
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const followSystem = (event) => {
    if (savedTheme()) return;
    root.classList.toggle('dark', event.matches);
    syncToggle();
  };
  if (systemDark.addEventListener) systemDark.addEventListener('change', followSystem);
  syncToggle();

  // 2. Reveal fallback
  const scrollDriven = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  if (!reduceMotion && !scrollDriven && 'IntersectionObserver' in window) {
    root.classList.add('io');
    const revealer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    document.querySelectorAll('[data-reveal]').forEach((el) => revealer.observe(el));
  }
})();
