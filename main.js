/* ============================================================
   @Odikka_ — motion
   GSAP + ScrollTrigger only. No smooth-scroll library:
   native scroll stays native, which is what touch devices want.
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  /* Without GSAP or with reduced motion the page still works:
     the roll call renders as a plain readable stack. */
  if (!hasGsap || reduceMotion) return;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Low-end devices: fewer ticks per second and one less transform
     channel beats dropping frames at a 60fps target. */
  var lite = (navigator.hardwareConcurrency || 8) <= 4;
  if (lite) gsap.ticker.fps(40);


  /* ----------------------------------------------------------
     Hero: one orchestrated entrance, then it gets out of the way
     ---------------------------------------------------------- */
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('[data-enter]', { y: 22, autoAlpha: 0, duration: 0.55, stagger: 0.075 })
    .from('.dp', { rotate: -14, scale: 0.88, duration: 0.75, ease: 'back.out(1.6)' }, 0.05);


  /* ----------------------------------------------------------
     The roll call: eight members drift bottom-to-top on a sine
     stagger. Each has its own start offset, sway width, wave
     frequency and rise distance, so nothing moves in lockstep.
     ---------------------------------------------------------- */
  var section = document.querySelector('.roast');
  var stage = section && section.querySelector('.stage');
  var floaters = section ? Array.prototype.slice.call(section.querySelectorAll('.floater')) : [];
  if (!section || !stage || !floaters.length) return;

  /* One row per member, in DOM order.
     delay = when it starts (0-1 of the section scroll)
     amp   = horizontal sway in px
     freq  = half-cycles of sway across its rise
     phase = where in the wave it begins
     tilt  = max rotation in degrees
     lift  = rise-distance multiplier (its vertical amplitude)

     Noufal's delay is negative on purpose: it means he is already a
     quarter of the way up when the section arrives, so the screen is
     never empty. Everyone after him starts below the fold and rises
     on scroll. */
  var WAVE = [
    { delay: -0.10, amp: 18, freq: 1.3, phase: 0.0, tilt:  5, lift: 1.00 }, // Noufal
    { delay:  0.00, amp: 30, freq: 1.8, phase: 1.1, tilt: -7, lift: 1.06 }, // Salman
    { delay:  0.10, amp: 22, freq: 1.1, phase: 2.2, tilt:  4, lift: 0.97 }, // Mahin
    { delay:  0.20, amp: 34, freq: 1.6, phase: 3.3, tilt: -6, lift: 1.04 }, // Ajfer
    { delay:  0.30, amp: 16, freq: 1.4, phase: 4.4, tilt:  6, lift: 0.99 }, // Deepu
    { delay:  0.40, amp: 28, freq: 2.0, phase: 5.5, tilt: -5, lift: 1.02 }, // Mubaris
    { delay:  0.50, amp: 24, freq: 1.2, phase: 6.6, tilt:  5, lift: 1.01 }, // Zayd
    { delay:  0.60, amp: 32, freq: 1.7, phase: 7.7, tilt: -4, lift: 0.96 }  // Santhosh
  ];
  var SPAN = 1 - WAVE[WAVE.length - 1].delay;   // so the last one finishes at the section's end

  section.classList.add('is-animated');
  gsap.set(floaters, { force3D: true });

  /* Transform-only writes, pre-compiled. No layout properties are ever touched. */
  var set = floaters.map(function (el) {
    return {
      x: gsap.quickSetter(el, 'x', 'px'),
      y: gsap.quickSetter(el, 'y', 'px'),
      r: gsap.quickSetter(el, 'rotation', 'deg'),
      s: gsap.quickSetter(el, 'scale'),
      o: gsap.quickSetter(el, 'opacity')
    };
  });

  var startY = [];
  var endY = [];
  var ampScale = 1;

  function measure() {
    var stageH = stage.offsetHeight;
    // Narrow screens get a gentler sway so nobody swings off-screen.
    ampScale = Math.max(0.5, Math.min(1, window.innerWidth / 640));

    for (var i = 0; i < floaters.length; i++) {
      var h = floaters[i].offsetHeight;
      startY[i] = stageH + 40;
      endY[i] = startY[i] - (stageH + h + 80) * WAVE[i].lift;
    }
  }

  function render(p) {
    for (var i = 0; i < WAVE.length; i++) {
      var c = WAVE[i];
      var s = set[i];

      var t = (p - c.delay) / SPAN;
      if (t < 0) t = 0; else if (t > 1) t = 1;

      var wave = Math.sin(t * Math.PI * c.freq + c.phase);

      s.y(startY[i] + (endY[i] - startY[i]) * t);
      s.x(wave * c.amp * ampScale);
      s.r(wave * c.tilt);
      if (!lite) s.s(0.93 + 0.07 * Math.sin(t * Math.PI));

      // Fade in off the floor, dissolve into the heading at the top.
      var o = Math.min(t / 0.10, (1 - t) / 0.12, 1);
      s.o(o < 0 ? 0 : o);
    }
  }

  measure();
  render(0);

  /* A scrubbed tween on a plain object gives us smoothed scroll
     progress; render() turns that single number into six paths. */
  var progress = { p: 0 };
  gsap.to(progress, {
    p: 1,
    ease: 'none',
    onUpdate: function () { render(progress.p); },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.45,
      invalidateOnRefresh: true
    }
  });

  ScrollTrigger.addEventListener('refreshInit', measure);

  // Bubble heights change once the display fonts land.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
