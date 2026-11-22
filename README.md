# Arena Chat - Prepend Chat Title to Tab Title

This is a Tampermonkey/Violentmonkey script that shows the active conversation's sidebar title in the browser tab title on arena.ai, making it easier to identify which conversation you're viewing when you have multiple tabs open.

---

## Features

- **Dynamic Tab Titles**: Reads the conversation title from the matching sidebar link and puts it in the browser tab title (e.g., "Chat Title - Arena")
- **SPA Navigation Support**: Updates the tab title when navigating between conversations without page reloads, using both history events and polling
- **Title Caching**: Caches chat titles by route so the tab title stays correct while the sidebar element is temporarily unavailable
- **Mutation Observers**: Uses MutationObserver to detect sidebar and title changes in real time
- **Debounced Updates**: Prevents excessive title updates during rapid DOM changes
- **Polling Fallback**: Includes periodic polling as a safety net to ensure titles stay synchronized
- **Sidebar Scanning**: If the conversation's sidebar link hasn't been rendered yet (long history, virtualized list), scrolls the sidebar until it appears, then restores your scroll position
- **Agent Mode Aware**: Uses "Agent Mode" as the site name for `/agent/` conversations

---

## Installation

1. Ensure you have a userscript manager installed (like [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)).
2. Click the following link to install the script:
   - [Arena Chat Tab Title Script Installation Link](https://github.com/endolith/Arena-Chat-Tab-Title/raw/refs/heads/master/arena-chat-tab-title.user.js)
3. After installation, refresh your Arena chat page.

---

## Usage

1. Open the Arena chat page (`https://arena.ai/`).
2. Open or navigate to any conversation in the sidebar.
3. The browser tab title will automatically update to show the conversation title followed by " - Arena" (or " - Agent Mode" in agent mode).
4. When switching between conversations, the tab title updates accordingly.

---

## How It Works

The script identifies the current conversation from the URL (`/c/...` or `/agent/...`) and looks for the sidebar link whose `href` matches that route. The title is read from the `span.body-sm.truncate` element inside that link, so it matches by URL instead of by sidebar position.

If the sidebar title is not present yet (e.g. while the page is loading), the last known title for that route is used from an in-memory cache. Navigation is detected with a MutationObserver, `popstate`/`hashchange` listeners, and a polling fallback that also catches `pushState`/`replaceState` without monkey-patching the site.

If the sidebar has not rendered the current conversation's link at all (long history / virtualized list), the script finds the sidebar's scroll container from any already-rendered conversation title, scrolls it down in steps waiting for items to load, and stops as soon as the matching link appears — then restores the original scroll position. Smooth scrolling is temporarily disabled on the sidebar while the scan runs, so it can jump instantly between positions. The scan is bounded, runs at most twice per route (the second attempt happens 10 s later if the sidebar was still loading), and aborts immediately if you scroll, press a key in the sidebar, or navigate away, so it never fights you for control.

The scan starts from wherever the list already is (it never jumps to the top first) and searches downward before trying upward. When it finds the conversation it leaves the sidebar showing that conversation, rather than restoring the position the list happened to have before the scan.

---

## Configuration

The script includes configurable options at the top of the function body:

- `separator`: Separator between chat title and site name (default: ` - `)
- `pollIntervalMs`: Polling interval as fallback (default: 1500ms)
- `debounceMs`: Debounce delay for DOM updates (default: 100ms)

---

## Feedback and Contributions

If you encounter issues or have suggestions for improvements, please submit an Issue or Pull Request at <https://github.com/endolith/Arena-Chat-Tab-Title>.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

(This was generated almost entirely by AI under human direction, so likely lacks the human authorship required for copyright in the US and is therefore in the public domain. MIT license applies anywhere else.)
