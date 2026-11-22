// ==UserScript==
// @name         Arena Chat - Prepend Chat Title to Tab Title
// @namespace    https://github.com/endolith/Arena-Chat-Tab-Title
// @version      1.0.0
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
  const cache = new Map(); // In-memory only; never sent anywhere.
  let currentRoute = '';
  let lastWritten = '';
  let originalTitle = '';
  let timer;

  function routeKey(url) {
    const path = url.pathname.replace(/\/+$/, '') || '/';
    // Do not use generic navigation links such as /agent or /c as chat IDs.
    if (!/^\/(?:c|agent)\/.+/.test(path)) return null;
    return path;
  }

  function findSidebarTitle(key) {
    // The supplied inspector output identifies the title as span.body-sm.truncate
    // inside the conversation link. Match the URL, not the sidebar position.
    for (const link of document.querySelectorAll('a[href]')) {
      let url;
      try { url = new URL(link.href, location.href); } catch { continue; }
      if (url.origin !== location.origin || routeKey(url) !== key) continue;
      const span = link.querySelector('span.body-sm.truncate');
      const text = span?.textContent?.trim();
      if (text) return text;
    }
    return '';
  }

  function update() {
    const key = routeKey(new URL(location.href));
    const route = location.pathname + location.search;
    if (route !== currentRoute) {
      // Remove our own old title immediately, even while the new page loads.
      if (lastWritten && document.title === lastWritten) {
        document.title = originalTitle || 'Arena';
      }
      currentRoute = route;
      lastWritten = '';
      originalTitle = document.title;
    }

    if (!key) return;
    const found = findSidebarTitle(key);
    if (found) cache.set(key, found);
    const chatTitle = found || cache.get(key);
    if (!chatTitle) return;

    // Remember the site's most recent title if it overwrote ours. Do not append
    // that variable title: it may contain the previous conversation's name.
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

  // Observe title changes, sidebar titles, links, and SPA navigation rendering.
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
  // Polling also detects pushState/replaceState without monkey-patching the site.
  setInterval(update, pollIntervalMs);
  update();
})();
