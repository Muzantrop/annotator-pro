# Annotator Pro

A Chrome Extension for annotating and editing screenshots directly within the active browser tab. 

Created as an open-source portfolio project for [Muzantrop](https://muzantrop.com), this tool is designed to reduce context-switching for Knowledge Managers, Technical Writers, and QA teams by eliminating the need to export raw screenshots to external desktop or online editors. It renders a non-destructive canvas over the current webpage, allowing for immediate annotation and export.

## Features & Tooling

The extension features a compact, Polaris-inspired UI with dropdown menus and a modular properties engine for customizing annotations.

* **Crop Tool:** Allows users to define specific bounding box coordinates before capturing the final screenshot, exporting only the targeted area.
* **Focus (Spotlight):** Applies a semi-opaque overlay to the page with a transparent, resizable geometric cutout to highlight specific UI components.
* **Numbered Badges:** Auto-incrementing badges for documenting sequential steps.
* **Tooltips & Text:** Text containers with configurable padding, border radius, and 4-way directional arrows (Top, Bottom, Left, Right).
* **Arrows & Lines:** Scalable vector arrows that maintain a consistent stroke width and arrowhead geometry during resizing, plus plain connector lines.
* **Box & Ellipse Highlights:** Rectangular and elliptical highlights with adjustable border widths, stroke styles (solid/dashed), and fill opacities.
* **Redaction:** Solid color blocks to obscure sensitive data (e.g., PII, API keys). Redaction blocks are locked to full opacity so they cannot accidentally be made see-through.
* **Font Sizing:** Adjustable font size for Text, Tooltip, and Badge elements.
* **Undo / Redo:** Full history stack with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` (also `Ctrl+Y`) plus toolbar buttons.
* **Optional Translation:** One-click text translation for Text, Tooltip, and Badge objects via a public Google Translate endpoint — no API keys or setup required (see the privacy note below).

## Global Export Processing

By deselecting all tools, users can access the global *Page Frame* settings. During the export process, the extension processes the image data to apply:
* **Canvas Cropping:** Slices the image to the user's defined crop coordinates.
* **Border Radius:** Applies a true transparent mask to the outer corners of the final image.
* **Global Borders:** Wraps the entire screenshot in a customizable solid stroke.

## State Management & Export

* **Template Save/Load:** Export the entire canvas layout and object configurations as a downloadable `.json` file. Load templates back into the canvas at any time to maintain visual consistency across documentation sets.
* **Persistent Local State:** Tool properties (colors, border radiuses, opacities) are saved to `chrome.storage.local` to persist across browser sessions.
* **Iterative Editing:** The annotation canvas remains active after saving or copying, allowing for continuous edits without losing the current layout.
* **Clipboard Integration:** In addition to standard file downloads, the extension supports writing the finalized canvas blob directly to the system clipboard via the `Clipboard API` (`navigator.clipboard.write`).

## Under the Hood & Technical Notes

Annotator Pro is built with Vanilla JavaScript, the HTML5 Canvas API, and Fabric.js. Because the extension injects a canvas directly into the user's active tab, it includes specific architectures to handle diverse host environments.

* **Local-First Processing:** There is no backend, cloud processing, or telemetry. All screenshot capture, annotation, and image export happen entirely on the user's machine. The **only** network request the extension can make is the optional **Translate** action, which sends the selected element's text to Google Translate on demand — nothing is sent unless you click Translate. That request is proxied through the background service worker and the extension declares a single scoped host permission (`https://translate.googleapis.com/*`) for it, rather than broad web access.
* **Handling Sandboxed Iframes:** Standard HTML `<a>` download tags are often blocked inside sandboxed `<iframe>` environments. To ensure downloads always succeed, finalized image data is passed to the background Service Worker via `chrome.runtime.sendMessage` to trigger the download outside the webpage's sandbox.
* **CSS Isolation:** To prevent aggressive global stylesheets from distorting the canvas geometry or hiding the toolbar, the UI is injected into the `<html>` root with isolated CSS resets and a maximum `z-index`. 
* **Anti-Zoom UI Scaling:** The toolbar dynamically calculates the browser's native zoom ratio and applies an inverse CSS scale. This guarantees the interface remains fully usable and properly sized even if the user zooms the webpage in or out drastically.
* **Bypassing DOM Sanitizers:** Instead of injecting raw `<svg>` tags (which security scripts like DOMPurify frequently strip out), the toolbar icons use pure CSS Masks (`-webkit-mask-image`). This ensures the UI renders perfectly on highly sanitized platforms.

## Installation (Developer Mode)

Annotator Pro is currently available as an unpacked developer extension. 

1. Download this repository as a `.zip` file and extract it, or clone it via terminal: `git clone https://github.com/Muzantrop/annotator-pro.git`
2. Open Chrome and navigate to `chrome://extensions/`
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select the extracted `annotator-pro` folder.
6. Pin the extension to your toolbar and click it to initialize the canvas.

---
*Created by Simon Akhrameev — [Muzantrop]*
