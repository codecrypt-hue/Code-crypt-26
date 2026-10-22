/**
 * Code Crypt — progressive-enhancement bootstrap.
 *
 * Loaded synchronously in <head> so the document is marked as JS-capable
 * before first paint. This lets style.css hide scroll-reveal elements and
 * show the loader only when JavaScript is actually running, so the site
 * degrades gracefully instead of showing a permanently blank page.
 *
 * Kept separate from script.js so it stays tiny and blocking.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');
})();
