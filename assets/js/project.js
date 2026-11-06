/* Kenny Huang portfolio: case study behaviour (theme and reveal live in site.js)
   1. Section bar: highlights the section being read and shows reading progress.
   2. Live site embed: a cover keeps the page scrolling until the visitor chooses to use the site.
   3. Key numbers count up when they come into view.
   4. Lightbox: any .fig-open button with data-full opens a full-size viewer (arrows, swipe, Esc).
   5. Marker highlights: each .hl phrase sweeps in as it scrolls into view, one at a time.
   6. Problem panel: the pointer bends the soft gradient toward itself.
   7. Focused steps: one step at a time takes precedence, on a loop on wider screens and by scrolling on phones.
   8. Render carousel: panels revolve on their own, with arrows, swipe and clicking a side panel to take over.
   9. Quote: everything else darkens while the quote is in the middle of the screen.
   10. Pitch link: fades down into place once the visitor reaches the end of the case study. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Section bar
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

  // 2. Live site embed
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

  // 3. Count up key numbers
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

  // 4. Lightbox
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

  // 5. Marker highlights. Phrases that arrive together wait their turn, and the marker keeps a steady
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
      // data-hl-ms sets a slower, deliberate draw for a single standout line
      const ms = Number(mark.dataset.hlMs) || Math.min(400, Math.max(250, mark.textContent.length * 3.5));
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

  // 6. Problem panel. Two points chase the pointer at different speeds, and --pull eases the bend in and out.
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

  // 7. Focused steps. The loop only runs while it can be seen; keyboard focus holds it on the focused step.
  // On phones the step crossing the middle of the screen takes over.
  const stepList = document.querySelector('[data-steps-focus]');
  if (stepList && !reduceMotion && 'IntersectionObserver' in window) {
    const items = Array.from(stepList.children);
    const phone = window.matchMedia('(max-width: 720px)');
    let active = 0;
    let timer = 0;
    let inView = false;
    let held = false;

    const focusStep = (i) => {
      active = i;
      stepList.dataset.active = String(i);
      items.forEach((item, j) => item.classList.toggle('is-active', j === i));
    };
    const syncLoop = () => {
      clearInterval(timer);
      timer = 0;
      if (phone.matches || !inView || held || document.hidden) return;
      timer = setInterval(() => {
        if (!(dialog && dialog.open)) focusStep((active + 1) % items.length);
      }, 3200);
    };

    focusStep(0);
    stepList.classList.add('is-live');

    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      syncLoop();
    }, { threshold: 0.3 }).observe(stepList);

    const middle = new IntersectionObserver((entries) => {
      if (!phone.matches) return;
      for (const entry of entries) {
        if (entry.isIntersecting) focusStep(items.indexOf(entry.target));
      }
    }, { rootMargin: '-50% 0px -50% 0px' });
    items.forEach((item) => middle.observe(item));

    stepList.addEventListener('focusin', (e) => {
      if (phone.matches || !e.target.matches(':focus-visible')) return;
      held = true;
      focusStep(items.indexOf(e.target.closest('li')));
      syncLoop();
    });
    stepList.addEventListener('focusout', () => { held = false; syncLoop(); });
    document.addEventListener('visibilitychange', syncLoop);
    if (phone.addEventListener) phone.addEventListener('change', syncLoop);
  }

  // 8. Render carousel. It holds still while the pointer is over it or the keyboard is inside it, so the
  // arrows and the front image stay put to be used. Only the front image opens the lightbox.
  const door = document.querySelector('[data-door]');
  if (door) {
    const stage = door.querySelector('.door-stage');
    const panels = Array.from(stage.querySelectorAll('.fig'));
    const slots = ['front', 'right', 'back', 'left'];
    let front = 0;
    let timer = 0;
    let inView = false;
    let hovered = false;
    let keyed = false;
    let swiped = false;
    let swipeX = null;

    const showPanel = (i) => {
      front = (i + panels.length) % panels.length;
      panels.forEach((panel, j) => {
        panel.dataset.slot = slots[(j - front + panels.length) % panels.length];
        panel.querySelector('.fig-open').tabIndex = j === front ? 0 : -1;
      });
    };
    const syncDoor = () => {
      clearInterval(timer);
      timer = 0;
      if (reduceMotion || !inView || hovered || keyed || document.hidden) return;
      timer = setInterval(() => {
        if (!(dialog && dialog.open)) showPanel(front + 1);
      }, 3600);
    };
    const turn = (i) => { showPanel(i); syncDoor(); };

    showPanel(0);
    door.classList.add('is-live');
    door.querySelectorAll('.door-arrow').forEach((arrow) => { arrow.hidden = false; });
    door.querySelector('[data-door-prev]').addEventListener('click', () => turn(front - 1));
    door.querySelector('[data-door-next]').addEventListener('click', () => turn(front + 1));

    // Runs before the lightbox's own click handler, so a swipe or a side panel never opens it
    stage.addEventListener('click', (e) => {
      const panel = e.target.closest('.fig');
      if (swiped) { swiped = false; e.stopPropagation(); return; }
      if (panel && panel.dataset.slot !== 'front') { e.stopPropagation(); turn(panels.indexOf(panel)); }
    }, true);

    stage.addEventListener('pointerdown', (e) => { swipeX = e.pointerType === 'mouse' ? null : e.clientX; swiped = false; });
    stage.addEventListener('pointerup', (e) => {
      if (swipeX === null) return;
      const dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) { swiped = true; turn(front + (dx < 0 ? 1 : -1)); }
    });
    stage.addEventListener('pointercancel', () => { swipeX = null; });

    door.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; syncDoor(); } });
    door.addEventListener('pointerleave', () => { hovered = false; syncDoor(); });
    door.addEventListener('focusin', (e) => { keyed = e.target.matches(':focus-visible'); syncDoor(); });
    door.addEventListener('focusout', () => { keyed = false; syncDoor(); });
    document.addEventListener('visibilitychange', syncDoor);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1].isIntersecting;
        syncDoor();
      }, { threshold: 0.3 }).observe(door);
    }
  }

  // 9. Quote
  const quote = document.querySelector('.cs-quote');
  const dim = document.querySelector('.cs-dim');
  if (quote && dim && 'IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const lit = entries[entries.length - 1].isIntersecting;
      quote.classList.toggle('is-lit', lit);
      dim.classList.toggle('is-lit', lit);
    }, { rootMargin: '-30% 0px -30% 0px' }).observe(quote);
  }

  // 10. Pitch link. Hidden only here, so it stays visible without script or with reduced motion.
  const pitchEnd = document.querySelector('[data-pitch-end]');
  if (pitchEnd && !reduceMotion && 'IntersectionObserver' in window) {
    pitchEnd.classList.add('is-waiting');
    const pitchWatcher = new IntersectionObserver((entries) => {
      if (!entries[entries.length - 1].isIntersecting) return;
      pitchWatcher.disconnect();
      pitchEnd.classList.add('in');
    }, { rootMargin: '0px 0px -6% 0px', threshold: 1 });
    pitchWatcher.observe(pitchEnd);
  }
})();
