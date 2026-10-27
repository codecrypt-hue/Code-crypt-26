/*!
 * Code Crypt — site interactions
 * ---------------------------------------------------------------------------
 * A single, dependency-free script shared by index.html, codecraze.html,
 * epl.html and TT.html.
 *
 * Design notes
 *  - Every module guards for missing elements, so the same file works on
 *    every page without throwing.
 *  - No inline event handlers and no globals: everything lives in this IIFE.
 *  - The pointer-reactive canvas is a port of the Oxford CompSoc hero
 *    animation. The native cursor is never hidden or replaced.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------------ utils */
  function $(selector, scope) {
    return (scope || doc).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
  }

  function on(target, type, handler, options) {
    if (target) {
      target.addEventListener(type, handler, options);
    }
  }

  /* ----------------------------------------------------------------- loader */
  /**
   * Dismiss the loading overlay. The overlay also carries a pure-CSS
   * failsafe animation, so it can never trap the visitor behind it.
   */
  function initLoader() {
    var loader = doc.getElementById('loader');
    if (!loader) {
      return;
    }

    var hide = function () {
      loader.classList.add('hidden');
    };

    if (doc.readyState === 'complete') {
      hide();
    } else {
      on(window, 'load', hide, { once: true });
    }

    // Belt and braces — never rely on a single event firing.
    window.setTimeout(hide, 2000);
  }

  /* --------------------------------------------------------- scroll chrome */
  function initScrollChrome() {
    var progress = doc.getElementById('scroll-progress');
    var navbar = doc.getElementById('navbar');
    var backButton = doc.getElementById('back-to-top');
    var queued = false;

    function update() {
      var docEl = doc.documentElement;
      var max = docEl.scrollHeight - docEl.clientHeight;
      var pct = max > 0 ? (docEl.scrollTop / max) * 100 : 0;

      if (progress) {
        progress.style.width = pct.toFixed(2) + '%';
      }
      if (navbar) {
        navbar.classList.toggle('scrolled', docEl.scrollTop > 20);
      }
      if (backButton) {
        backButton.classList.toggle('visible', docEl.scrollTop > 480);
      }
      queued = false;
    }

    function requestUpdate() {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(update);
      }
    }

    on(window, 'scroll', requestUpdate, { passive: true });
    on(window, 'resize', requestUpdate, { passive: true });
    update();

    on(backButton, 'click', function () {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion.matches ? 'auto' : 'smooth'
      });
    });
  }

  /* ------------------------------------------------------------ mobile nav */
  function initNav() {
    var hamburger = doc.getElementById('hamburger');
    var navLinks = doc.getElementById('nav-links');
    if (!hamburger || !navLinks) {
      return;
    }

    function setOpen(open) {
      hamburger.classList.toggle('open', open);
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    on(hamburger, 'click', function () {
      setOpen(!navLinks.classList.contains('open'));
    });

    $$('#nav-links a').forEach(function (link) {
      on(link, 'click', function () {
        setOpen(false);
      });
    });

    on(doc, 'keydown', function (event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    on(window, 'resize', function () {
      if (window.innerWidth > 860) {
        setOpen(false);
      }
    });
  }

  /* ------------------------------------------------------------ scroll spy */
  function initScrollSpy() {
    var sections = $$('main section[id]');
    var navItems = $$('.nav-link[data-section]');
    if (!sections.length || !navItems.length || !('IntersectionObserver' in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navItems.forEach(function (item) {
              var isCurrent = item.getAttribute('data-section') === entry.target.id;
              item.classList.toggle('active', isCurrent);
              if (isCurrent) {
                item.setAttribute('aria-current', 'true');
              } else {
                item.removeAttribute('aria-current');
              }
            });
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /* --------------------------------------------------------------- reveal */
  function initReveal() {
    var elements = $$('.reveal');
    if (!elements.length || !('IntersectionObserver' in window)) {
      elements.forEach(function (element) {
        element.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (element) {
      observer.observe(element);
    });
  }

  /* ------------------------------------------------------------ typewriter */
  function initTypewriter() {
    var target = doc.getElementById('typewriter');
    if (!target) {
      return;
    }

    var phrases = [
      'Where Logic Meets Legend.',
      'Decoding the future, one commit at a time.',
      'Hack. Learn. Build. Repeat.'
    ];

    if (reduceMotion.matches) {
      target.textContent = phrases[0];
      return;
    }

    var phraseIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function tick() {
      var current = phrases[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        target.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          window.setTimeout(tick, 1600);
          return;
        }
      } else {
        charIndex -= 1;
        target.textContent = current.slice(0, Math.max(charIndex, 0));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
        }
      }

      window.setTimeout(tick, deleting ? 35 : 55);
    }

    tick();
  }

  /* ------------------------------------------------------------ accordions */
  /**
   * Accordion heads are real <button> elements carrying aria-expanded and
   * aria-controls, so keyboard and screen-reader users get the behaviour for
   * free.
   */
  function initAccordions() {
    $$('.accordion-head').forEach(function (head) {
      on(head, 'click', function () {
        var item = head.closest ? head.closest('.accordion') : null;
        if (!item) {
          return;
        }
        var open = !item.classList.contains('active');
        item.classList.toggle('active', open);
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ------------------------------------------------------------------ tabs */
  /**
   * Tab buttons declare their target panel through data-tab-panel. Sibling
   * tabs in the same row are deactivated, and the matching panel in the same
   * scope is revealed.
   */
  function initTabs() {
    var rows = $$('.tab-row');
    if (!rows.length) {
      return;
    }

    // Normalise the markup: aria-selected and the roving tabindex have to
    // agree with the `active` class that ships in the HTML.
    rows.forEach(function (row) {
      $$('[data-tab-panel]', row).forEach(function (button) {
        var isActive = button.classList.contains('active');
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
          button.removeAttribute('tabindex');
        } else {
          button.setAttribute('tabindex', '-1');
        }
      });
    });

    $$('[data-tab-panel]').forEach(function (button) {
      on(button, 'click', function () {
        var row = button.parentElement;
        var scope = row ? row.parentElement : null;
        var targetId = button.getAttribute('data-tab-panel');
        if (!scope || !targetId) {
          return;
        }

        $$('[data-tab-panel]', row).forEach(function (sibling) {
          sibling.classList.remove('active');
          sibling.setAttribute('aria-selected', 'false');
          sibling.setAttribute('tabindex', '-1');
        });

        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        button.removeAttribute('tabindex');

        $$(':scope > .tab-panel', scope).forEach(function (panel) {
          panel.classList.toggle('active', panel.id === targetId);
        });
      });
    });
  }

  /* --------------------------------------------------- reference pointer canvas */
  /**
   * Faithful port of https://ox.compsoc.net/'s hero_animation.js.
   *
   * Fifty points are scattered in normalised coordinates with a minimum
   * spacing of 0.1 and rendered as thick orthogonal (L-shaped) traces. When
   * the pointer is within max(width, height) / 8 of a point's home position,
   * that point is pulled towards the pointer using a fixed 0.7 / 0.3 lerp and
   * its trace stretches from the home position out to the animated position;
   * when the pointer moves away the point springs back home. The canvas is
   * repainted in full on every frame.
   *
   * Preserved exactly from the reference: point count (50), the spacing
   * rejection loop, the random connection direction per point, the 12px home
   * offset, the max(w, h) / 8 attraction radius, the 0.7 / 0.3 lerp, the
   * 2-segment L geometry, the 6px stroke width, the full-canvas repaint and
   * the per-frame (not delta-timed) requestAnimationFrame loop.
   *
   * Deliberate, documented changes:
   *   - colours: charcoal base with a teal -> off-white gradient, per the
   *     approved palette (the reference uses navy with teal/indigo/plum);
   *   - the gradient is rebuilt on resize (the reference builds it once, so
   *     its gradient stops pinning themselves after a window resize);
   *   - reduced-motion and touch-only visitors get a single static frame
   *     instead of a continuous loop;
   *   - the reference's trailing "connMode highlight" pass is omitted: its
   *     condition tests `window.width`, which is undefined, so the branch is
   *     dead and nothing is ever filled.
   */
  function initField() {
    var canvas = doc.getElementById('cc-field');
    if (!canvas) {
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    var NUM_POINTS = 50;
    var OFFSET = 12;
    var LINE_WIDTH = 6;
    var BASE = '#111817';
    var STOPS = [
      [0, '#2c666e'],
      [0.5, '#2c666e'],
      [1, '#f0edee']
    ];

    var points = [];
    var gradient = null;
    var mouseX = 0;
    var mouseY = 0;
    var running = false;

    /* Scatter points, rejecting any that land within 0.1 of an existing one.
       The loop keeps generating until 50 valid points exist, exactly like the
       reference. */
    while (points.length < NUM_POINTS) {
      var x = Math.random();
      var y = Math.random();
      var valid = true;
      for (var i = 0; i < points.length; i++) {
        var dx = x - points[i].x;
        var dy = y - points[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.1) {
          valid = false;
          break;
        }
      }
      if (valid) {
        points.push({
          x: x,
          y: y,
          animX: x,
          animY: y,
          connMode: Math.random() < 0.5
        });
      }
    }

    function resize() {
      /* 1:1 with CSS pixels, as in the reference, so the 6px strokes keep
         their reference weight rather than halfing on high-DPI screens. */
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;

      ctx.lineWidth = LINE_WIDTH;

      gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      for (var s = 0; s < STOPS.length; s++) {
        gradient.addColorStop(STOPS[s][0], STOPS[s][1]);
      }
      ctx.fillStyle = gradient;
      ctx.strokeStyle = gradient;
    }

    function draw() {
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = gradient;

      var connectionRadius = Math.max(canvas.width, canvas.height) / 8;

      for (var i = 0; i < points.length; i++) {
        var point = points[i];
        var fromX = point.x * canvas.width + OFFSET;
        var fromY = point.y * canvas.height + OFFSET;

        var mouseDx = mouseX - fromX;
        var mouseDy = mouseY - fromY;
        var mouseD = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        var targetX = fromX;
        var targetY = fromY;
        if (mouseD < connectionRadius) {
          targetX = mouseX;
          targetY = mouseY;
        }

        point.animX = 0.7 * point.animX + 0.3 * targetX;
        point.animY = 0.7 * point.animY + 0.3 * targetY;

        var toX = point.animX;
        var toY = point.animY;

        var dx = toX - fromX;
        var dy = toY - fromY;
        var sx = Math.sign(dx);
        var sy = Math.sign(dy);
        var dmin = Math.min(Math.abs(dx), Math.abs(dy));

        ctx.beginPath();
        if (point.connMode) {
          /* L stretched from the home position towards the pointer. */
          ctx.moveTo(fromX, fromY);
          ctx.lineTo(fromX + dmin * sx, fromY + dmin * sy);
          ctx.lineTo(fromX + dx, fromY + dy);
        } else {
          /* Mirror image: the L runs back from the animated position home. */
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - dmin * sx, toY - dmin * sy);
          ctx.lineTo(toX - dx, toY - dy);
        }
        ctx.stroke();
      }
    }

    function frame() {
      draw();
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) {
        return;
      }
      running = true;
      window.requestAnimationFrame(frame);
    }

    /* Park every point on its home position so a one-shot paint shows the
       resting field rather than a slice of the intro sweep. */
    function settle() {
      for (var i = 0; i < points.length; i++) {
        points[i].animX = points[i].x * canvas.width + OFFSET;
        points[i].animY = points[i].y * canvas.height + OFFSET;
      }
    }

    resize();

    on(window, 'mousemove', function (event) {
      /* Same coordinate mapping as the reference: offset by the canvas box and
         scale into the backing store. */
      var rect = canvas.getBoundingClientRect();
      mouseX = (event.clientX - rect.left) * (canvas.width / canvas.clientWidth);
      mouseY = (event.clientY - rect.top) * (canvas.height / canvas.clientHeight);
    }, { passive: true });

    on(window, 'resize', function () {
      resize();
      if (!running) {
        settle();
        draw();
      }
    }, { passive: true });

    if (reduceMotion.matches || !finePointer.matches) {
      /* No animation requested, or no mouse to drive it: paint the field once
         so the page still looks intentional, then stop. */
      settle();
      draw();
      return;
    }

    start();
  }

  /* -------------------------------------------------------- gallery orbit */
  /**
   * 3D Circular Photo Orbit (Billboarded)
   *
   * Photos revolve along an elliptical 3D orbit driven by page scroll, pointer
   * dragging and interactive navigation buttons. Every photo card faces the
   * viewer directly (billboarded: 0deg rotation on X/Y/Z) using translate3d
   * and scale only. Front photos are prominent, sharp, and highlighted; rear
   * photos scale down with depth-of-field blur and subtle opacity.
   */
  function initGalleryOrbit() {
    var section = doc.getElementById('gallery');
    if (!section) {
      return;
    }

    var stage = $('#gallery-orbit-stage', section);
    var carousel = $('#orbit-carousel', section);
    var cards = $$('.orbit-card', section);
    var prevBtn = $('.orbit-btn--prev', section);
    var nextBtn = $('.orbit-btn--next', section);
    var dotsContainer = $('#orbit-dots', section);

    if (!stage || !carousel || !cards.length) {
      return;
    }

    var numCards = cards.length;
    var baseAngleStep = (Math.PI * 2) / numCards;

    var targetAngle = 0;
    var currentAngle = 0;
    var manualOffset = 0;
    var targetManualOffset = 0;
    var isDragging = false;
    var dragStartX = 0;
    var lastDragX = 0;
    var dragVelocity = 0;

    // Generate pagination dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      cards.forEach(function (_, idx) {
        var dot = doc.createElement('button');
        dot.type = 'button';
        dot.className = 'orbit-dot' + (idx === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to photo ' + (idx + 1));
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        dot.addEventListener('click', function () {
          rotateToCard(idx);
        });
        dotsContainer.appendChild(dot);
      });
    }

    var dots = $$('.orbit-dot', dotsContainer);

    function updateMetrics() {
      var stageRect = stage.getBoundingClientRect();
      var stageW = stageRect.width || window.innerWidth;
      var stageH = stageRect.height || (window.innerHeight * 0.6);

      var rx = Math.min(stageW * 0.40, 470);
      var ry = Math.min(stageH * 0.22, 110);

      if (window.innerWidth < 600) {
        rx = Math.min(stageW * 0.37, 160);
        ry = Math.min(stageH * 0.18, 50);
      } else if (window.innerWidth < 900) {
        rx = Math.min(stageW * 0.39, 310);
        ry = Math.min(stageH * 0.20, 80);
      }

      return { rx: rx, ry: ry, stageW: stageW, stageH: stageH };
    }

    var metrics = updateMetrics();

    function render(angle) {
      var rx = metrics.rx;
      var ry = metrics.ry;
      var closestIndex = 0;
      var maxDepth = -Infinity;

      for (var i = 0; i < numCards; i++) {
        var card = cards[i];
        // Angle around the orbit
        var theta = angle + i * baseAngleStep;

        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        // Depth: +1 is front (closest), -1 is back (furthest)
        var z = cosTheta;
        var normDepth = (z + 1) * 0.5; // [0, 1]

        if (z > maxDepth) {
          maxDepth = z;
          closestIndex = i;
        }

        // Perspective foreshortening
        var persp = 0.84 + 0.24 * normDepth;
        var x = rx * sinTheta * persp;
        var y = ry * z + (metrics.stageW > 600 ? 14 : 8) * normDepth;

        // Front card is scale ~1.06, rear card is scale ~0.58
        var scale = 0.58 + 0.48 * normDepth;

        // Opacity: front is 1.0, rear is 0.38
        var opacity = 0.38 + 0.62 * Math.pow(normDepth, 0.85);

        // Depth of field blur: 0px at front, up to 2.2px at rear
        var blur = (1 - normDepth) * 2.2;

        // Stacking order: front always on top
        var zIndex = Math.round(normDepth * 100) + 10;

        /* CRITICAL: Rotate photos' positions around the circle, NOT the photos
           themselves. translate3d + scale only — zero rotateX/rotateY/rotateZ. */
        card.style.transform = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0px) translate(-50%, -50%) scale(' + scale.toFixed(3) + ')';
        card.style.opacity = opacity.toFixed(3);
        card.style.zIndex = zIndex;
        card.style.filter = blur > 0.35 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';

        var isFront = normDepth > 0.88;
        card.classList.toggle('is-front', isFront);
        card.setAttribute('aria-hidden', normDepth < 0.25 ? 'true' : 'false');
      }

      // Update active pagination dot
      if (dots.length) {
        dots.forEach(function (d, idx) {
          var isActive = idx === closestIndex;
          d.classList.toggle('active', isActive);
          d.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
      }
    }

    function rotateToCard(index) {
      // Bring card index to the front (cos(theta) = 1, so theta = 0)
      var currentBase = currentAngle - manualOffset;
      var targetTotal = -index * baseAngleStep;
      var diff = (targetTotal - (currentBase + manualOffset)) % (Math.PI * 2);
      if (diff > Math.PI) diff -= Math.PI * 2;
      if (diff < -Math.PI) diff += Math.PI * 2;
      targetManualOffset = manualOffset + diff;
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        targetManualOffset -= baseAngleStep;
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        targetManualOffset += baseAngleStep;
      });
    }

    cards.forEach(function (card, idx) {
      card.addEventListener('click', function () {
        rotateToCard(idx);
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          rotateToCard(idx);
        }
      });
    });

    // Pointer drag to spin the orbit
    on(stage, 'pointerdown', function (e) {
      isDragging = true;
      dragStartX = e.clientX;
      lastDragX = e.clientX;
      dragVelocity = 0;
      if (stage.setPointerCapture) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    });

    on(stage, 'pointermove', function (e) {
      if (!isDragging) return;
      var delta = e.clientX - lastDragX;
      lastDragX = e.clientX;
      dragVelocity = delta;
      var sens = window.innerWidth < 600 ? 0.007 : 0.0045;
      targetManualOffset += delta * sens;
      manualOffset = targetManualOffset;
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      targetManualOffset += dragVelocity * 0.015;
      if (stage.releasePointerCapture && e && e.pointerId) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    }

    on(stage, 'pointerup', endDrag);
    on(stage, 'pointercancel', endDrag);

    // Scroll progress handler
    function onScroll() {
      if (reduceMotion.matches) return;
      var rect = section.getBoundingClientRect();
      var scrollDist = rect.height - window.innerHeight;
      if (scrollDist > 0) {
        var progress = -rect.top / scrollDist;
        progress = Math.max(0, Math.min(1, progress));
        targetAngle = progress * Math.PI * 2 * 1.5;
      }
    }

    function tick() {
      if (!reduceMotion.matches) {
        manualOffset += (targetManualOffset - manualOffset) * 0.12;
        currentAngle += ((targetAngle + manualOffset) - currentAngle) * 0.12;
      } else {
        manualOffset += (targetManualOffset - manualOffset) * 0.2;
        currentAngle = manualOffset;
      }

      render(currentAngle);
      requestAnimationFrame(tick);
    }

    on(window, 'scroll', onScroll, { passive: true });
    on(window, 'resize', function () {
      metrics = updateMetrics();
      render(currentAngle);
    }, { passive: true });

    onScroll();
    metrics = updateMetrics();
    render(0);
    tick();
  }

  /* -------------------------------------------------------------- bootstrap */
  function init() {
    initLoader();
    initScrollChrome();
    initNav();
    initScrollSpy();
    initReveal();
    initTypewriter();
    initAccordions();
    initTabs();
    initGalleryOrbit();
    initField();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
