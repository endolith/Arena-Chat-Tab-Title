// ==UserScript==
// @name         Arena Chat - Prepend Chat Title to Tab Title
// @namespace    https://github.com/endolith/Arena-Chat-Tab-Title
// @version      1.1.0
// @description  Prepends the active conversation title to the browser tab title on arena.ai (e.g. "Chat Title - Arena")
// @author       endolith
// @match        https://arena.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=arena.ai
// @license      MIT
// @homepageURL  https://github.com/endolith/Arena-Chat-Tab-Title
// @supportURL   https://github.com/endolith/Arena-Chat-Tab-Title/issues
// @downloadURL  https://raw.githubusercontent.com/endolith/Arena-Chat-Tab-Title/master/arena-chat-tab-title.user.js
// @updateURL    https://raw.githubusercontent.com/endolith/Arena-Chat-Tab-Title/master/arena-chat-tab-title.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const separator = ' - ';
  const pollIntervalMs = 1500;
  const debounceMs = 100;
  const scanDelayMs = 600; // Time allowed for sidebar items to load after each scroll.
  const cache = new Map(); // In-memory only; never sent anywhere.
  let currentRoute = '';
  let lastWritten = '';
  let originalTitle = '';
  let timer;
  let scanKey = null;
  let attemptedKey = null;

  function routeKey(url) {
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (!/^\/(?:c|agent)\/.+/.test(path)) return null;
    return path;
  }

  function findSidebarTitle(key) {
    for (const link of document.querySelectorAll('a[href]')) {
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (url.origin !== location.origin || routeKey(url) !== key) continue;
      const text = link.querySelector('span.body-sm.truncate')?.textContent?.trim();
      if (text) return text;
    }
    return '';
  }

  function findSidebarScroller() {
    // Find the scrollable sidebar from a conversation title already rendered.
    // This avoids relying on the long, position-dependent Inspector selector.
    for (const span of document.querySelectorAll('a[href] span.body-sm.truncate')) {
      const link = span.closest('a[href]');
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (url.origin !== location.origin || !routeKey(url)) continue;
      for (let el = link.parentElement; el && el !== document.body; el = el.parentElement) {
        const overflow = getComputedStyle(el).overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && el.clientHeight > 0 &&
            el.scrollHeight > el.clientHeight + 1) return el;
      }
    }
    return null;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function scanSidebar(key, scroller) {
    scanKey = key;
    attemptedKey = key;
    const originalTop = scroller.scrollTop;
    let lastSetTop = originalTop;
    let userIntervened = false;
    // Detect direct user interaction so we do not fight their scrolling or
    // restore the sidebar over their chosen position.
    const onInteraction = () => { userIntervened = true; };
    scroller.addEventListener('wheel', onInteraction, { passive: true });
    scroller.addEventListener('touchstart', onInteraction, { passive: true });
    scroller.addEventListener('pointerdown', onInteraction, { passive: true });
    try {
      scroller.scrollTop = 0;
      lastSetTop = scroller.scrollTop;
      // Bounded scan: at most 100 steps, avoiding an infinite loop if the
      // sidebar keeps loading new history indefinitely.
      for (let i = 0; i < 100; i++) {
        await wait(scanDelayMs);
        if (userIntervened || !scroller.isConnected || routeKey(new URL(location.href)) !== key) break;
        // Stop if something else moved the scroller substantially.
        if (Math.abs(scroller.scrollTop - lastSetTop) > 3) {
          userIntervened = true;
          break;
        }
        const title = findSidebarTitle(key);
        if (title) {
          cache.set(key, title);
          update();
          break;
        }
        const max = scroller.scrollHeight - scroller.clientHeight;
        if (scroller.scrollTop >= max - 1) {
          // Give infinite loading one extra moment at the bottom.
          await wait(scanDelayMs);
          if (userIntervened || routeKey(new URL(location.href)) !== key) break;
          const loadedTitle = findSidebarTitle(key);
          if (loadedTitle) {
            cache.set(key, loadedTitle);
            update();
            break;
          }
          if (scroller.scrollHeight - scroller.clientHeight <= max + 1) break;
        }
        scroller.scrollTop = Math.min(scroller.scrollTop + Math.max(100, scroller.clientHeight * 0.8), scroller.scrollHeight);
        lastSetTop = scroller.scrollTop;
      }
    } finally {
      scroller.removeEventListener('wheel', onInteraction);
      scroller.removeEventListener('touchstart', onInteraction);
      scroller.removeEventListener('pointerdown', onInteraction);
      if (!userIntervened && scroller.isConnected) scroller.scrollTop = originalTop;
      scanKey = null;
      scheduleUpdate();
    }
  }

  function update() {
    const key = routeKey(new URL(location.href));
    const route = location.pathname + location.search;
    if (route !== currentRoute) {
      if (lastWritten && document.title === lastWritten) document.title = originalTitle || 'Arena';
      currentRoute = route;
      lastWritten = '';
      originalTitle = document.title;
      attemptedKey = null;
    }
    if (!key) return;
    const found = findSidebarTitle(key);
    if (found) cache.set(key, found);
    const chatTitle = found || cache.get(key);
    if (!chatTitle) {
      // Wait until a suitable scrollable sidebar exists. Attempt only once per
      // route visit; navigation to another conversation enables a fresh scan.
      if (!scanKey && attemptedKey !== key) {
        const scroller = findSidebarScroller();
        if (scroller) void scanSidebar(key, scroller);
      }
      return;
    }
    if (document.title !== lastWritten) originalTitle = document.title;
    const siteName = key.startsWith('/agent/') ? 'Agent Mode' : 'Arena';
    const desired = chatTitle + separator + siteName;
    if (document.title !== desired) document.title = desired;
    lastWritten = desired;
  }

  function scheduleUpdate() {
    clearTimeout(timer);
    timer = setTimeout(update, debounceMs);
  }

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['href', 'data-active', 'aria-current']
  });
  window.addEventListener('popstate', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  setInterval(update, pollIntervalMs);
  update();
})();
