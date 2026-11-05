/* Kenny Huang portfolio: case study behaviour (theme and reveal live in site.js)
   1. Logo with the back arrow: returns to the homepage where the visitor left it.
   2. Section bar: highlights the section being read and shows reading progress.
   3. Live site embed: a cover keeps the page scrolling until the visitor chooses to use the site.
   4. Key numbers count up when they come into view.
   5. Lightbox: any .fig-open button with data-full opens a full-size viewer (arrows, swipe, Esc).
   6. Marker highlights: each .hl phrase sweeps in as it scrolls into view, one at a time.
   7. Problem panel: the pointer bends the soft gradient toward itself. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Back to the homepage, keeping its scroll position when the visitor came from it
  const back = document.querySelector('[data-back]');
  if (back) {
    back.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        const fromHome = ref && ref.origin === location.origin && /(\/|index\.html)$/.test(ref.pathname);
        if (fromHome && history.length > 1) { e.preventDefault(); history.back(); }
      } catch (err) { /* follow the link normally */ }
    });
  }

  // 2. Section bar
  const strip = document.querySelector('.secnav-strip');
  if (strip) {
    const secnav = strip.closest('.secnav');
    const pill = strip.querySelector('.secnav-pill');
    const progress = secnav.querySelector('.secnav-progress');
    const links = Array.from(strip.querySelectorAll('a[href^="#"]'));
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
    const scrollDriven = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
    const jsProgress = progress && (!scrollDriven || reduceMotion);
    let current = -1;

    const place = (i, force) => {
      if (i === current && !force) return;
      const wasHidden = current < 0;
      current = i;
      links.forEach((a, j) => { if (j === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      if (i < 0) { pill.style.opacity = '0'; return; }
      const a = links[i];
      if (wasHidden || force) pill.style.transition = 'none';
      pill.style.width = a.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      pill.style.opacity = '1';
      if (wasHidden || force) { void pill.offsetWidth; pill.style.transition = ''; }
      const left = a.offsetLeft - 16;
      const right = a.offsetLeft + a.offsetWidth + 16;
      if (left < strip.scrollLeft || right > strip.scrollLeft + strip.clientWidth) {
        strip.scrollTo({ left: a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      // A section counts as current once its top passes a line a quarter of the way down the visible area
      const line = (parseFloat(getComputedStyle(secnav).top) || 0) + secnav.offsetHeight + window.innerHeight * 0.25;
      const doc = document.documentElement;
      let idx = -1;
      targets.forEach((t, j) => { if (t && t.getBoundingClientRect().top <= line) idx = j; });
      if (idx >= 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 4) idx = targets.length - 1;
      place(idx);
      if (jsProgress) {
        const max = doc.scrollHeight - window.innerHeight;
        progress.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
      }
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', () => { const i = current; current = -1; place(i, true); request(); });
    update();
  }

  // 3. Live site embed
  document.querySelectorAll('[data-embed]').forEach((embed) => {
    const cover = embed.querySelector('[data-embed-cover]');
    const frame = embed.querySelector('iframe');
    const full = embed.querySelector('[data-embed-full]');
    const goLive = () => {
      embed.classList.add('is-live');
      try { frame.focus({ preventScroll: true }); } catch (e) { /* cross-origin focus refused */ }
    };
    if (cover) cover.addEventListener('click', goLive);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !document.fullscreenElement) embed.classList.remove('is-live');
        }
      }).observe(embed);
    }
    if (full && document.fullscreenEnabled && embed.requestFullscreen) {
      full.hidden = false;
      const label = full.querySelector('.label');
      const iconMax = full.querySelector('.i-max');
      const iconMin = full.querySelector('.i-min');
      full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else embed.requestFullscreen().then(goLive).catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => {
        const on = document.fullscreenElement === embed;
        label.textContent = on ? 'Exit full screen' : 'Full screen';
        iconMax.style.display = on ? 'none' : '';
        iconMin.style.display = on ? '' : 'none';
      });
    }
  });

  // 4. Count up key numbers
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduceMotion && 'IntersectionObserver' in window) {
    const run = (el) => {
      const end = parseInt(el.dataset.count, 10);
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 1100);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const counter = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        counter.unobserve(entry.target);
        run(entry.target);
      }
    }, { threshold: 0.6 });
    counters.forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) el.textContent = '0';
      counter.observe(el);
    });
  }

  // 5. Lightbox
  const dialog = document.querySelector('.lb');
  const openers = Array.from(document.querySelectorAll('.fig-open[data-full]'));
  if (dialog && openers.length && typeof dialog.showModal === 'function') {
    const img = dialog.querySelector('.lb-stage img');
    const caption = dialog.querySelector('.lb-cap');
    const count = dialog.querySelector('.lb-count');
    const stage = dialog.querySelector('.lb-stage');
    let index = 0;
    let opener = null;

    const show = (n) => {
      index = (n + openers.length) % openers.length;
      const button = openers[index];
      const fig = button.closest('figure');
      const cap = fig && fig.querySelector('figcaption');
      img.src = button.dataset.full;
      img.alt = button.querySelector('img').alt;
      caption.textContent = cap ? cap.textContent.trim() : '';
      count.textContent = (index + 1) + ' / ' + openers.length;
      img.style.animation = 'none';
      void img.offsetWidth;
      img.style.animation = '';
    };

    openers.forEach((button, n) => button.addEventListener('click', () => {
      opener = button;
      show(n);
      dialog.showModal();
    }));
    dialog.querySelector('[data-lb-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-lb-prev]').addEventListener('click', () => show(index - 1));
    dialog.querySelector('[data-lb-next]').addEventListener('click', () => show(index + 1));
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    });
    dialog.addEventListener('close', () => {
      img.removeAttribute('src');
      if (opener) opener.focus({ preventScroll: true });
    });

    // Swipe between images; tap outside the image to close. Two fingers means pinch zoom, not swipe.
    const pointers = new Set();
    let startX = null;
    let swiped = false;
    stage.addEventListener('pointerdown', (e) => {
      pointers.add(e.pointerId);
      startX = pointers.size === 1 ? e.clientX : null;
      swiped = false;
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (startX === null || e.type === 'pointercancel') { startX = null; return; }
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) { swiped = true; show(dx < 0 ? index + 1 : index - 1); }
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    dialog.addEventListener('click', (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === dialog || e.target === stage) dialog.close();
    });
  }

  // 6. Marker highlights. Phrases that arrive together wait their turn, and the marker keeps a steady
  // pace because the duration follows the length of the phrase.
  const marks = Array.from(document.querySelectorAll('.hl'));
  if (reduceMotion || !('IntersectionObserver' in window)) {
    marks.forEach((mark) => mark.classList.add('on'));
  } else if (marks.length) {
    const queue = [];
    let drawing = false;
    const drawNext = () => {
      const mark = queue.shift();
      drawing = Boolean(mark);
      if (!mark) return;
      const ms = Math.min(400, Math.max(250, mark.textContent.length * 3.5));
      mark.style.setProperty('--hl-ms', ms + 'ms');
      mark.classList.add('on');
      setTimeout(drawNext, ms + 40);
    };
    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        watcher.unobserve(entry.target);
        queue.push(entry.target);
      }
      if (!drawing) drawNext();
    }, { rootMargin: '0px 0px -28% 0px', threshold: 0.9 });
    marks.forEach((mark) => watcher.observe(mark));
  }

  // 7. Problem panel. Two points chase the pointer at different speeds, and --pull eases the bend in and out.
  const panel = document.querySelector('.statement');
  if (panel && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const aim = { x: 0, y: 0 };
    const near = { x: 0, y: 0 };
    const far = { x: 0, y: 0 };
    let pull = 0;
    let goal = 0;
    let frame = 0;
    let last = 0;

    const paint = () => {
      panel.style.setProperty('--pull', pull.toFixed(4));
      panel.style.setProperty('--nx', near.x + 'px');
      panel.style.setProperty('--ny', near.y + 'px');
      panel.style.setProperty('--fx', far.x + 'px');
      panel.style.setProperty('--fy', far.y + 'px');
    };
    const chase = (point, dt, lag) => {
      const k = 1 - Math.exp(-dt / lag);
      point.x += (aim.x - point.x) * k;
      point.y += (aim.y - point.y) * k;
    };
    const step = (now) => {
      const dt = Math.min(now - last, 50);
      last = now;
      chase(near, dt, 140);
      chase(far, dt, 320);
      pull += (goal - pull) * (1 - Math.exp(-dt / 260));
      paint();
      const settled = Math.abs(aim.x - far.x) + Math.abs(aim.y - far.y) < 0.5 && Math.abs(goal - pull) < 0.002;
      frame = settled ? 0 : requestAnimationFrame(step);
    };
    const wake = () => {
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(step); }
    };
    const track = (e) => {
      const box = panel.getBoundingClientRect();
      aim.x = e.clientX - box.left;
      aim.y = e.clientY - box.top;
    };

    panel.addEventListener('pointerenter', (e) => {
      track(e);
      if (pull < 0.01) { Object.assign(near, aim); Object.assign(far, aim); }
      goal = 1;
      wake();
    });
    panel.addEventListener('pointermove', (e) => { track(e); wake(); });
    panel.addEventListener('pointerleave', () => { goal = 0; wake(); });
  }
})();
