/* Kenny Huang portfolio: homepage behaviour (theme and reveal live in site.js)
   In order: video thumbnails, the phone menu, the Experience rows' jump to the Resume link, the portrait card,
   and the design process wheel.

   Video thumbnails: give a .tile-media element data-video="assets/video/name.mp4" and the loop
   replaces the still once it can play. Clips only load and play while on screen, and are skipped
   for visitors who have reduced motion or data saving turned on. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const connection = navigator.connection || {};
  const media = Array.from(document.querySelectorAll('.tile-media[data-video]')).filter((m) => m.dataset.video);
  if (!media.length || reduceMotion || connection.saveData) return;

  const player = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target.querySelector('video');
      if (!video) continue;
      if (entry.isIntersecting) {
        if (!video.src) video.src = entry.target.dataset.video;
        video.play().catch(() => { /* autoplay refused, the still stays */ });
      } else {
        video.pause();
      }
    }
  }, { threshold: 0.35 });

  for (const m of media) {
    const still = m.querySelector('img');
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';
    video.setAttribute('aria-hidden', 'true');
    if (still) video.poster = still.currentSrc || still.src;
    video.addEventListener('playing', () => m.classList.add('has-video'), { once: true });
    m.insertBefore(video, still ? still.nextSibling : m.firstChild);
    player.observe(m);
  }
})();

/* Phone menu: the drawer stays open until a link, the backdrop, Escape, or the button closes it */
(() => {
  const nav = document.querySelector('.nav');
  const burger = nav && nav.querySelector('.nav-burger');
  if (!burger) return;
  const menu = document.getElementById(burger.getAttribute('aria-controls'));
  const phone = window.matchMedia('(max-width: 720px)');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('nav-locked', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  const isOpen = () => nav.classList.contains('is-open');

  burger.addEventListener('click', () => setOpen(!isOpen()));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('click', (event) => {
    if (isOpen() && !menu.contains(event.target) && !burger.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) { setOpen(false); burger.focus(); }
  });
  // Tabbing out of the drawer closes it, so the keyboard never ends up behind the backdrop
  menu.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    if (isOpen() && next && !menu.contains(next) && next !== burger) setOpen(false);
  });
  const closeOnWiden = (event) => { if (!event.matches) setOpen(false); };
  if (phone.addEventListener) phone.addEventListener('change', closeOnWiden);
})();

/* Experience rows scroll to the Resume link, then flash it once the scroll has landed */
(() => {
  const resume = document.getElementById('resume');
  if (!resume) return;
  const FLASH = { duration: 700, delay: 150, easing: 'ease' };
  const PEAK = 0.25;
  let watching = 0;

  const flash = () => {
    resume.animate(
      { opacity: [0, 1, 0], offset: [0, PEAK, 1] },
      { ...FLASH, pseudoElement: '::before' }
    );
    resume.animate([{ color: '#0b2540', offset: PEAK }], FLASH);
  };

  // Smooth scrolling reports no reliable end across browsers, and no scroll happens at all if the link is
  // already on screen. Waiting until the position has held still covers every case.
  const whenScrollSettles = (done) => {
    const id = ++watching;
    let lastY = window.scrollY;
    let stillSince = performance.now();
    const check = (now) => {
      if (id !== watching) return;
      if (window.scrollY !== lastY) { lastY = window.scrollY; stillSince = now; }
      if (now - stillSince > 120) done();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  };

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-to-resume]')) return;
    event.preventDefault();
    resume.scrollIntoView({ block: 'center' });
    resume.focus({ preventScroll: true });
    whenScrollSettles(flash);
  });
})();

/* Portrait card: tilts toward the cursor and flips on click, swapping the title and text beside it.
   Every moving value is a spring, so the card carries its momentum when the cursor changes direction or a flip
   is interrupted. The loop only runs while something is moving. */
(() => {
  const card = document.querySelector('[data-card]');
  if (!card) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tiltEl = card.querySelector('.card-tilt');
  const flipEl = card.querySelector('.card-flip');
  const frontEl = card.querySelector('.card-front');
  const shadowEl = card.querySelector('.card-shadow');
  const glares = card.querySelectorAll('.card-glare');
  const panels = Array.from(document.querySelectorAll('[data-swap]'));
  const status = document.querySelector('[data-swap-status]');
  const video = card.querySelector('.card-video');
  const playVideo = video && !reduceMotion && !(navigator.connection || {}).saveData;

  const TILT_DEG = 12;       // furthest the card leans at its edges
  const LIFT_PX = 10;        // how far it rises on hover
  const POP_PX = 70;         // how far it comes toward the viewer mid-flip
  const TITLE_MS_PER_CHAR = 30;
  const BODY_MS = 2400;      // the whole text types out in this time, however long it is
  const FADE_MS = 120;       // old text clears before the new text starts

  const spring = (k, c) => ({ x: 0, v: 0, to: 0, k, c });
  const s = {
    rx: spring(170, 18), ry: spring(170, 18),
    lift: spring(220, 26),
    flip: spring(130, 17)
  };
  const moving = Object.values(s);

  const render = () => {
    const turn = Math.abs(Math.sin(s.flip.x * Math.PI / 180)); // 0 lying flat, 1 edge-on
    tiltEl.style.transform =
      `translate3d(0, ${-s.lift.x * LIFT_PX}px, ${turn * POP_PX}px) rotateX(${s.rx.x}deg) rotateY(${s.ry.x}deg)`;
    flipEl.style.transform = `rotateY(${s.flip.x}deg)`;
    // Backface hiding can leave the still showing at the card's corner on some graphics hardware, so it goes fully
    // once the card has passed edge-on
    frontEl.style.visibility = Math.cos(s.flip.x * Math.PI / 180) < 0 ? 'hidden' : '';
    shadowEl.style.opacity = Math.max(s.lift.x, turn * 0.6);
    shadowEl.style.transform =
      `translate3d(${-s.ry.x * 1.2}px, ${s.rx.x * 1.2 + s.lift.x * 10}px, 0) scaleX(${1 - turn * 0.6})`;
    for (const glare of glares) {
      glare.style.opacity = s.lift.x;
      glare.style.transform = `translate3d(${s.ry.x / TILT_DEG * 25}%, ${-s.rx.x / TILT_DEG * 25}%, 0)`;
    }
  };

  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    let settled = true;
    for (const m of moving) {
      m.v += (m.k * (m.to - m.x) - m.c * m.v) * dt;
      m.x += m.v * dt;
      if (Math.abs(m.to - m.x) > 0.01 || Math.abs(m.v) > 0.01) settled = false;
    }
    if (settled) for (const m of moving) { m.x = m.to; m.v = 0; }
    render();
    raf = settled ? 0 : requestAnimationFrame(frame);
  };
  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  // Tilt follows mice and pens. Fingers tap to flip, and a tap has nothing to follow.
  if (!reduceMotion) {
    card.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') { s.lift.to = 1; wake(); }
    });
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const x = event.offsetX / card.clientWidth - 0.5;
      const y = event.offsetY / card.clientHeight - 0.5;
      s.ry.to = x * 2 * TILT_DEG;
      s.rx.to = -y * 2 * TILT_DEG;
      s.lift.to = 1;
      wake();
    });
    card.addEventListener('pointerleave', () => {
      s.rx.to = 0; s.ry.to = 0; s.lift.to = 0;
      wake();
    });
  }

  // Typing. Each character gets its own span while typing, which keeps every line break exactly where the
  // finished text will have it. The original markup goes back when typing ends.
  const typedParts = (panel) => {
    if (panel.querySelector('[data-wheel]')) return []; // the wheel spins in instead of typing
    const paragraphs = panel.querySelectorAll('.bio');
    return paragraphs.length ? Array.from(paragraphs) : [panel];
  };
  const sources = new Map();
  for (const panel of panels) for (const el of typedParts(panel)) sources.set(el, el.innerHTML);

  const split = (el) => {
    el.innerHTML = sources.get(el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const chars = [];
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const char of node.data.replace(/\s+/g, ' ')) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = char;
        fragment.append(span);
        chars.push(span);
      }
      node.replaceWith(fragment);
    }
    el.classList.add('typing');
    return chars;
  };

  let run = 0;
  const typeOut = (els, delay, duration, thisRun) => {
    const chars = els.flatMap(split);
    const start = performance.now() + delay;
    let shown = 0;
    const tick = (now) => {
      if (thisRun !== run) return;
      const due = Math.min(chars.length, Math.floor(Math.max(0, now - start) / duration * chars.length));
      if (due > shown) {
        if (shown) chars[shown - 1].classList.remove('at');
        while (shown < due) chars[shown++].classList.add('on');
        chars[shown - 1].classList.add('at');
      }
      if (shown < chars.length) { requestAnimationFrame(tick); return; }
      for (const el of els) {
        el.classList.remove('typing');
        el.innerHTML = sources.get(el);
      }
    };
    requestAnimationFrame(tick);
  };

  const showView = (name) => {
    const thisRun = ++run;
    for (const panel of panels) panel.classList.toggle('is-active', panel.dataset.swap === name);
    if (reduceMotion) return;
    const [title, body] = panels.filter((panel) => panel.dataset.swap === name);
    const titleMs = title.textContent.length * TITLE_MS_PER_CHAR;
    typeOut([title], FADE_MS, titleMs, thisRun);
    typeOut(typedParts(body), FADE_MS + titleMs / 2, BODY_MS, thisRun);
    body.dispatchEvent(new Event('swapin'));
  };

  let flipped = false;
  card.addEventListener('click', (event) => {
    flipped = !flipped;
    // The side you press goes down first, like pushing on the edge of a real card. Keyboard clicks have no side.
    const leftSide = event.detail > 0 && event.offsetX < card.clientWidth / 2;
    if (reduceMotion) card.classList.toggle('is-flipped', flipped);
    else { s.flip.to += leftSide ? -180 : 180; wake(); }
    // The clip only runs while it faces the viewer. Until it can play, or if there is no file, the logo shows.
    if (playVideo) {
      if (flipped) video.play().catch(() => {});
      else video.pause();
    }
    showView(flipped ? 'process' : 'about');
    status.textContent = flipped ? 'Showing My Design Process' : 'Showing About me';
    card.setAttribute('aria-label', flipped
      ? 'Back of the portrait card. Flip the card back to About me'
      : 'Portrait of Kenny Huang. Flip the card to see my design process');
  });
})();

/* Design process wheel: the steps sit on a vertical revolving door, the same shape as the render carousel on
   the project pages but turned on its side. pos is the wheel's position in steps and can pass through any
   fraction while it moves, but it always comes to rest on a whole number, so no step stops halfway. Dragging
   follows the pointer 1:1, and letting go hands the speed to a spring aimed at the step the flick would reach.
   The wheel loops, and grabbing it mid-spin stops it under the pointer. */
(() => {
  const wheel = document.querySelector('[data-wheel]');
  if (!wheel) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = wheel.querySelector('.wheel-stage');
  const steps = Array.from(wheel.querySelectorAll('.step'));
  const descriptions = steps.map((step) => step.querySelector('.step-desc'));
  const status = document.querySelector('[data-swap-status]');
  const count = steps.length;

  const UP = 1;              // 1 puts the next step on top and the previous below. -1 swaps them.
  const DEPTH = 0.32;        // how far the neighbours sit behind, in step heights
  const TILT_DEG = 30;       // how far the neighbours lean away
  const SIDE_OPACITY = 0.78;
  const FADE_STEPS = 0.5;    // steps past a neighbour's slot it takes to fade out completely
  const PROJECT_S = 0.2;     // a flick lands where its speed would carry it in this time
  const MAX_SPIN = 3;        // most steps one flick can travel
  const STIFFNESS = 170;
  const DAMP_SETTLE = 26;    // arrows and slow releases arrive with no bounce
  const DAMP_FLICK = 21;     // a thrown wheel overshoots slightly
  const TRAIL_MS = 100;      // only the last moments of a drag count toward its speed

  let pos = 0;
  let target = 0;
  let vel = 0;
  let damping = DAMP_SETTLE;
  let height = 0;
  let spread = 0;            // how far a neighbour sits from centre, in pixels
  let drag = null;
  let shown = 0;

  const wrap = (i) => ((i % count) + count) % count;

  const render = () => {
    steps.forEach((step, i) => {
      let offset = wrap(i - pos);
      if (offset > count / 2) offset -= count;
      const away = Math.abs(offset);
      const slot = Math.max(-2, Math.min(2, UP * offset)); // 0 front, 1 top, -1 bottom, 2 parked out of sight
      const turn = slot * Math.PI / 2;
      step.style.transform =
        `translate3d(0, ${-Math.sin(turn) * spread}px, ${(Math.cos(turn) - 1) * DEPTH * height}px) rotateX(${Math.sin(turn) * TILT_DEG}deg)`;
      step.style.opacity = away < 1
        ? 1 - (1 - SIDE_OPACITY) * away
        : Math.max(0, SIDE_OPACITY * (1 - (away - 1) / FADE_STEPS));
      step.style.setProperty('--below', Math.min(1, Math.max(0, -slot)));
      descriptions[i].style.opacity = Math.max(0, 1 - away * 2.5);
    });
  };

  const land = () => {
    const i = wrap(target);
    if (i === shown) return;
    steps[shown].removeAttribute('aria-current');
    steps[i].setAttribute('aria-current', 'step');
    shown = i;
    status.textContent = `Step ${i + 1} of ${count}: ${steps[i].querySelector('.step-title').textContent}`;
  };

  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    vel += (STIFFNESS * (target - pos) - damping * vel) * dt;
    pos += vel * dt;
    const settled = Math.abs(target - pos) < 0.0005 && Math.abs(vel) < 0.005;
    if (settled) { pos = target; vel = 0; }
    render();
    if (settled) { raf = 0; land(); } else raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    if (reduceMotion) { pos = target; vel = 0; render(); land(); return; }
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const measure = () => {
    height = steps[0].offsetHeight;
    spread = parseFloat(getComputedStyle(stage).getPropertyValue('--spread')) * height;
    wheel.style.setProperty('--step-h', `${height}px`);
    render();
  };
  new ResizeObserver(measure).observe(steps[0]);
  measure();
  steps[0].setAttribute('aria-current', 'step');

  const turnTo = (i, withDamping = DAMP_SETTLE) => {
    target = i;
    damping = withDamping;
    wake();
  };
  wheel.querySelector('[data-wheel-up]').addEventListener('click', () => { if (!drag) turnTo(target + UP); });
  wheel.querySelector('[data-wheel-down]').addEventListener('click', () => { if (!drag) turnTo(target - UP); });

  // One drag distance is how far a step moves near the centre, so the front step stays under the pointer
  const pixelsPerStep = () => spread * Math.PI / 2;

  stage.addEventListener('pointerdown', (event) => {
    if (event.button) return;
    stage.setPointerCapture(event.pointerId);
    cancelAnimationFrame(raf);
    raf = 0;
    vel = 0;
    drag = { startY: event.clientY, startPos: pos, moved: false, trail: [{ t: event.timeStamp, y: event.clientY }] };
    stage.classList.add('is-dragging');
  });

  stage.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dy) > 6) drag.moved = true;
    pos = drag.startPos + UP * dy / pixelsPerStep();
    drag.trail.push({ t: event.timeStamp, y: event.clientY });
    while (event.timeStamp - drag.trail[0].t > TRAIL_MS) drag.trail.shift();
    render();
  });

  const release = (event) => {
    if (!drag) return;
    const { moved, trail } = drag;
    drag = null;
    stage.classList.remove('is-dragging');

    // A press that never moved is a click: above or below the front step turns to that neighbour
    if (!moved) {
      target = Math.round(pos);
      const front = steps[wrap(target)].getBoundingClientRect();
      if (event.type === 'pointerup' && event.clientY < front.top) target += UP;
      else if (event.type === 'pointerup' && event.clientY > front.bottom) target -= UP;
      turnTo(target);
      return;
    }

    // Holding still before letting go leaves nothing in the trail, so the wheel just settles on the nearest step
    const recent = trail.filter((point) => event.timeStamp - point.t <= TRAIL_MS);
    const first = recent[0];
    const final = recent[recent.length - 1];
    const seconds = first && final.t > first.t ? (final.t - first.t) / 1000 : 0;
    vel = seconds ? UP * (final.y - first.y) / seconds / pixelsPerStep() : 0;
    const carry = Math.max(-MAX_SPIN, Math.min(MAX_SPIN, vel * PROJECT_S));
    turnTo(Math.round(pos + carry), Math.abs(vel) > 1 ? DAMP_FLICK : DAMP_SETTLE);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // Arriving from the card flip, the wheel rolls into place
  wheel.closest('[data-swap]').addEventListener('swapin', () => {
    if (drag) return;
    pos = target - 1.25;
    vel = 0;
    render();
    turnTo(target);
  });
})();
