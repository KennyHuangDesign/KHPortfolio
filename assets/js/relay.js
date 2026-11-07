/* Kenny Huang portfolio: Relay + Switchboard prototype phones (loads after project.js)
   Each phone leans toward the pointer, less than the homepage card, and its glass sheen moves with it.
   The prototype inside is a page from another site, which hides the pointer from this page. So the glass sits
   over the screen until the phone is clicked: then the phone settles flat and the prototype takes the pointer,
   until the pointer leaves the phone's area again.
   While a phone is hovered or in use, the section is marked with data-active, and relay.css lights the
   background from that phone's side of the page. */
(() => {
  const proto = document.querySelector('[data-proto]');
  if (!proto) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TILT_DEG = 6;   // furthest a phone leans at its edges (the homepage card leans 12)
  const LIFT_PX = 8;    // how far it rises while hovered or in use

  const spring = (k, c, x = 0) => ({ x, v: 0, to: x, k, c });
  const devices = Array.from(proto.querySelectorAll('[data-device]')).map((el) => ({
    el,
    name: el.dataset.device,
    stage: el.querySelector('.device-stage'),
    phone: el.querySelector('.phone'),
    shadow: el.querySelector('.phone-shadow'),
    glass: el.querySelector('.phone-glass'),
    frame: el.querySelector('iframe'),
    hover: false,
    engaged: false,
    s: {
      rx: spring(120, 16), ry: spring(120, 16), lift: spring(170, 24),
      sx: spring(90, 18, 0.3), sy: spring(90, 18, 0.1)
    }
  }));

  // The lit side follows the phone being hovered, then the one in use, then the one with keyboard focus
  const updateActive = () => {
    const focused = devices.find((d) => document.activeElement === d.frame || document.activeElement === d.glass);
    const active = devices.find((d) => d.hover) || devices.find((d) => d.engaged) || focused;
    if (active) proto.dataset.active = active.name;
    else delete proto.dataset.active;
  };

  const render = (d) => {
    const { rx, ry, lift, sx, sy } = d.s;
    d.phone.style.transform =
      `translate3d(0, ${-lift.x * LIFT_PX}px, 0) rotateX(${rx.x}deg) rotateY(${ry.x}deg)`;
    d.shadow.style.opacity = 0.55 + lift.x * 0.3;
    d.shadow.style.transform = `translate3d(${-ry.x * 2.4}px, ${rx.x * 2 + lift.x * 14}px, 0) scale(${1 - lift.x * 0.04})`;
    d.glass.style.setProperty('--sx', `${(sx.x * 100).toFixed(1)}%`);
    d.glass.style.setProperty('--sy', `${(sy.x * 100).toFixed(1)}%`);
    d.glass.style.setProperty('--lift', lift.x.toFixed(3));
  };

  let raf = 0;
  let last = 0;
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    let settled = true;
    for (const d of devices) {
      const springs = Object.values(d.s);
      let still = true;
      for (const m of springs) {
        m.v += (m.k * (m.to - m.x) - m.c * m.v) * dt;
        m.x += m.v * dt;
        if (Math.abs(m.to - m.x) > 0.001 || Math.abs(m.v) > 0.001) still = false;
      }
      if (still) for (const m of springs) { m.x = m.to; m.v = 0; }
      else settled = false;
      render(d);
    }
    raf = settled ? 0 : requestAnimationFrame(frame);
  };
  const wake = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const settle = (d) => {
    d.s.rx.to = 0; d.s.ry.to = 0;
    d.s.sx.to = 0.3; d.s.sy.to = 0.1;
    d.s.lift.to = d.engaged ? 1 : 0;
    wake();
  };

  const engage = (d) => {
    if (d.engaged) return;
    d.engaged = true;
    d.el.classList.add('is-engaged');
    settle(d);
    d.frame.focus({ preventScroll: true });
    updateActive();
  };
  const release = (d) => {
    if (!d.engaged) return;
    d.engaged = false;
    d.el.classList.remove('is-engaged');
    settle(d);
    updateActive();
  };

  for (const d of devices) {
    // Lean toward the pointer, measured against the phone's resting place so the lean can't feed back into itself
    d.stage.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      if (!d.hover) { d.hover = true; d.el.classList.add('is-hover'); updateActive(); }
      if (d.engaged || reduceMotion) return;
      const box = d.stage.getBoundingClientRect();
      const x = Math.max(-0.5, Math.min(0.5, (event.clientX - box.left - d.phone.offsetLeft) / d.phone.offsetWidth - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (event.clientY - box.top - d.phone.offsetTop) / d.phone.offsetHeight - 0.5));
      d.s.ry.to = x * 2 * TILT_DEG;
      d.s.rx.to = -y * 2 * TILT_DEG;
      d.s.sx.to = x + 0.5;
      d.s.sy.to = y + 0.5;
      d.s.lift.to = 1;
      wake();
    });
    d.stage.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      d.hover = false;
      d.el.classList.remove('is-hover');
      if (d.engaged) release(d);
      else { settle(d); updateActive(); }
    });

    d.glass.addEventListener('click', () => engage(d));
    d.glass.addEventListener('focus', updateActive);
    d.glass.addEventListener('blur', updateActive);

    const full = d.el.querySelector('[data-device-full]');
    if (full) {
      if (!document.fullscreenEnabled) full.hidden = true;
      full.addEventListener('click', () => d.frame.requestFullscreen && d.frame.requestFullscreen());
    }
  }

  // Touch: tapping outside a phone in use hands the page back
  document.addEventListener('pointerdown', (event) => {
    for (const d of devices) if (d.engaged && !d.stage.contains(event.target)) release(d);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') devices.forEach(release);
  });
  // Clicking into a prototype moves focus out of this page, and clicking back moves it in again
  window.addEventListener('blur', () => setTimeout(updateActive, 0));
  window.addEventListener('focus', () => setTimeout(updateActive, 0));

  devices.forEach(render);
})();

/* Relay's four steps: a line fills along each step's top line in turn, at a steady pace, and lights its number.
   After the last step it holds, fades out and starts again. It only runs while the steps are on screen. */
(() => {
  const list = document.querySelector('[data-progress]');
  if (!list) return;
  const steps = Array.from(list.querySelectorAll('.point'));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    steps.forEach((s) => s.classList.add('is-reached', 'is-filled'));
    return;
  }
  const FILL_MS = 1400;  // one step's line
  const GAP_MS = 220;    // crossing the gap to the next step
  const HOLD_MS = 2000;  // all four lit before fading
  const FADE_MS = 500;
  list.style.setProperty('--fill-ms', `${FILL_MS}ms`);

  let next = 0;
  let timer = 0;
  let visible = false;

  const advance = () => {
    timer = 0;
    if (!visible) return;
    if (next < steps.length) {
      steps[next].classList.add('is-reached', 'is-filled');
      next += 1;
      timer = setTimeout(advance, FILL_MS + GAP_MS);
      return;
    }
    // Hold, fade the lines out, clear them while hidden, then start over
    timer = setTimeout(() => {
      list.classList.add('is-resetting');
      steps.forEach((s) => s.classList.remove('is-reached'));
      timer = setTimeout(() => {
        steps.forEach((s) => s.classList.remove('is-filled'));
        requestAnimationFrame(() => requestAnimationFrame(() => {
          list.classList.remove('is-resetting');
          next = 0;
          timer = setTimeout(advance, 400);
        }));
      }, FADE_MS);
    }, HOLD_MS);
  };

  if (!('IntersectionObserver' in window)) { visible = true; advance(); return; }
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !timer) advance();
  }, { threshold: 0.5 }).observe(list);
})();
