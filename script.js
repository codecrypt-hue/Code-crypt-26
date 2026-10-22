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
 *  - The custom cursor and the magnetic circuit field are progressive
 *    enhancements. They only activate for fine pointers and are skipped
 *    entirely when the visitor prefers reduced motion.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var TAU = Math.PI * 2;

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

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
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

  /* ----------------------------------------------------- magnetic circuit field */
  /**
   * Adapted from the Oxford CompSoc hero animation: a scatter of nodes that
   * are magnetically drawn towards the pointer while it is nearby, each
   * trailing an orthogonal "circuit trace".
   */
  function initField() {
    var canvas = doc.getElementById('cc-field');
    if (!canvas || reduceMotion.matches) {
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    var COUNT = 34;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var gradient = null;
    var nodes = [];
    var pointer = { x: -9999, y: -9999 };
    var running = false;

    function buildNodes() {
      nodes = [];
      for (var i = 0; i < COUNT; i++) {
        var x = Math.random();
        var y = Math.random();
        var valid = true;
        for (var j = 0; j < nodes.length; j++) {
          var dx = x - nodes[j].hx;
          var dy = y - nodes[j].hy;
          if (Math.sqrt(dx * dx + dy * dy) < 0.1) {
            valid = false;
            break;
          }
        }
        if (valid) {
          nodes.push({
            hx: x,
            hy: y,
            x: x,
            y: y,
            mode: Math.random() < 0.5 ? 0 : 1,
            arm: random(18, 34)
          });
        }
      }
    }

    function resize() {
      width = canvas.clientWidth || window.innerWidth;
      height = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#00afaf');
      gradient.addColorStop(0.5, '#5b4bc4');
      gradient.addColorStop(1, '#c77dff');
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);

      var radius = Math.max(width, height) / 8;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var dx = pointer.x - node.x * width;
        var dy = pointer.y - node.y * height;
        var distance = Math.sqrt(dx * dx + dy * dy);

        var targetX = node.hx * width;
        var targetY = node.hy * height;

        if (distance < radius) {
          // Magnetic pull towards the pointer.
          targetX = pointer.x;
          targetY = pointer.y;
        }

        node.x += ((targetX / width) - node.x) * 0.1;
        node.y += ((targetY / height) - node.y) * 0.1;

        var px = node.x * width;
        var py = node.y * height;

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.globalAlpha = distance < radius ? 0.4 : 0.18;

        ctx.beginPath();
        ctx.moveTo(px, py);
        if (node.mode) {
          ctx.lineTo(px + node.arm, py);
          ctx.lineTo(px + node.arm, py + node.arm);
        } else {
          ctx.lineTo(px, py + node.arm);
          ctx.lineTo(px + node.arm, py + node.arm);
        }
        ctx.stroke();

        ctx.globalAlpha = distance < radius ? 0.75 : 0.35;
        ctx.fillStyle = '#54c0cc';
        ctx.beginPath();
        ctx.arc(px, py, 1.6, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      running = true;
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduceMotion.matches) {
        return;
      }
      running = true;
      window.requestAnimationFrame(frame);
    }

    buildNodes();
    resize();

    on(window, 'resize', function () {
      resize();
      buildNodes();
    }, { passive: true });

    on(window, 'pointermove', function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }, { passive: true });

    on(doc, 'visibilitychange', function () {
      if (doc.hidden) {
        running = false;
      } else {
        start();
      }
    });

    start();
  }

  /* ---------------------------------------------------------- custom cursor */
  /**
   * A crisp cyan core with a tapering gradient trail, circuit vias along the
   * trail, drifting teal/violet particles and a hover ring for interactive
   * elements.
   *
   * Only enabled for fine pointers, and never when reduced motion is asked
   * for — in both cases the native cursor is left untouched.
   */
  function initCursor() {
    var canvas = doc.getElementById('cc-cursor');
    if (!canvas || reduceMotion.matches || !finePointer.matches) {
      return;
    }

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    var INTERACTIVE = [
      'a',
      'button',
      'input',
      'select',
      'textarea',
      'summary',
      '[role="button"]',
      '[role="tab"]',
      '.btn',
      '.pill',
      '.ticket',
      '.polaroid',
      '.accordion-head',
      '.tab',
      '.tab-sm',
      '.stamp',
      '.dir-row',
      '.contact-card',
      '.value-chip',
      '.ps-card',
      '.tile',
      '.team-icons i'
    ].join(', ');

    var TRAIL_MAX = 20;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;

    var pointer = { x: -100, y: -100 };
    var core = { x: -100, y: -100 };
    var trail = [];
    var particles = [];
    var hovering = false;
    var hoverAmount = 0;
    var visible = false;
    var running = false;
    var lastX = -100;
    var lastY = -100;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawnParticles(x, y, dx, dy) {
      var speed = Math.sqrt(dx * dx + dy * dy);
      var count = Math.min(3, Math.floor(speed / 14));
      for (var i = 0; i < count; i++) {
        particles.push({
          x: x + random(-3, 3),
          y: y + random(-3, 3),
          vx: dx * 0.16 + random(-0.5, 0.5),
          vy: dy * 0.16 + random(-0.5, 0.5),
          life: 1,
          size: random(1.1, 2.6),
          violet: Math.random() < 0.5
        });
      }
      if (particles.length > 90) {
        particles.splice(0, particles.length - 90);
      }
    }

    function updateParticles() {
      for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.life -= 0.022;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    }

    function drawTrail() {
      var count = trail.length;
      if (count < 2) {
        return;
      }

      var head = trail[count - 1];
      var tail = trail[0];
      var gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      gradient.addColorStop(0, 'rgba(199, 125, 255, 0)');
      gradient.addColorStop(0.35, 'rgba(0, 175, 175, 0.28)');
      gradient.addColorStop(0.75, 'rgba(22, 217, 232, 0.55)');
      gradient.addColorStop(1, 'rgba(22, 217, 232, 0.9)');

      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (var i = 1; i < count; i++) {
        var t = i / (count - 1);
        ctx.lineWidth = (0.6 + t * 6.2) * (1 + hoverAmount * 0.45);
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
    }

    function drawVias() {
      ctx.strokeStyle = 'rgba(84, 192, 204, 0.32)';
      ctx.lineWidth = 1;
      for (var i = 5; i < trail.length; i += 5) {
        var point = trail[i];
        var length = 5 + (i / trail.length) * 9;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + length, point.y);
        ctx.lineTo(point.x + length, point.y + length);
        ctx.stroke();

        ctx.fillStyle = 'rgba(22, 217, 232, 0.6)';
        ctx.fillRect(point.x - 1.6, point.y - 1.6, 3.2, 3.2);
      }
    }

    function drawParticles() {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life) * 0.75;
        ctx.fillStyle = p.violet ? '#c77dff' : '#00afaf';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function drawCore() {
      var glow = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 24);
      glow.addColorStop(0, 'rgba(22, 217, 232, 0.4)');
      glow.addColorStop(1, 'rgba(22, 217, 232, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(core.x, core.y, 24, 0, TAU);
      ctx.fill();

      if (hoverAmount > 0.01) {
        ctx.strokeStyle = 'rgba(22, 217, 232, ' + (0.8 * hoverAmount).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(core.x, core.y, 7 + 13 * hoverAmount, 0, TAU);
        ctx.stroke();
      }

      ctx.fillStyle = '#16d9e8';
      ctx.strokeStyle = 'rgba(3, 13, 23, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(core.x, core.y, Math.max(1.6, 3.6 - hoverAmount * 1.1), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);

      hoverAmount += ((hovering ? 1 : 0) - hoverAmount) * 0.16;

      if (visible) {
        core.x += (pointer.x - core.x) * 0.55;
        core.y += (pointer.y - core.y) * 0.55;
      }

      updateParticles();
      drawTrail();
      drawVias();
      drawParticles();
      drawCore();

      running = true;
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running) {
        return;
      }
      running = true;
      root.classList.add('cc-cursor-on');
      window.requestAnimationFrame(frame);
    }

    resize();

    on(window, 'resize', resize, { passive: true });

    on(window, 'pointermove', function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!visible) {
        visible = true;
        core.x = pointer.x;
        core.y = pointer.y;
      }

      var dx = pointer.x - lastX;
      var dy = pointer.y - lastY;
      lastX = pointer.x;
      lastY = pointer.y;

      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 1.2) {
        trail.push({ x: pointer.x, y: pointer.y });
        if (trail.length > TRAIL_MAX) {
          trail.shift();
        }
        if (distance > 6) {
          spawnParticles(pointer.x, pointer.y, dx, dy);
        }
      }

      start();
    }, { passive: true });

    on(doc, 'pointerover', function (event) {
      var target = event.target;
      hovering = !!(target && target.closest && target.closest(INTERACTIVE));
    });

    on(doc, 'pointerleave', function () {
      visible = false;
      trail.length = 0;
    });

    on(doc, 'visibilitychange', function () {
      if (doc.hidden) {
        visible = false;
      }
    });
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
    initField();
    initCursor();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
