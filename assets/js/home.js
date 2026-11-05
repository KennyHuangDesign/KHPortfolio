/* Kenny Huang portfolio: homepage behaviour (theme and reveal live in site.js)
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
