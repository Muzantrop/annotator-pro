// --- Toolbar click: inject Fabric (only if needed) + the annotator ---
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Avoid re-parsing the 300KB Fabric bundle if it is already on the page.
    const [{ result: fabricLoaded } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => typeof window.fabric !== "undefined"
    });

    if (!fabricLoaded) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["fabric.min.js"]
      });
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["annotator.js"]
    });
  } catch (err) {
    // Restricted surfaces (chrome://, the Web Store, the PDF viewer, etc.)
    // cannot be scripted. Give the user a brief visual signal instead of failing silently.
    console.warn("Annotator Pro could not run on this page:", err);
    chrome.action.setBadgeBackgroundColor({ color: "#e77674" });
    chrome.action.setBadgeText({ tabId: tab.id, text: "×" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 2500);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Take the initial raw screenshot of the visible tab.
  if (request.action === "takeScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: (chrome.runtime.lastError || {}).message || "capture failed" });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true;
  }

  // 2. Receive the processed/cropped image and download it outside the page sandbox.
  if (request.action === "downloadProcessedImage") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    chrome.downloads.download({
      url: request.dataUrl,
      filename: `annotator-pro-${stamp}.png`,
      saveAs: true
    });
    sendResponse({ success: true });
    return true;
  }

  // 3. Proxy translation through the worker so it is immune to the host page's CSP
  //    and needs only a single scoped host permission.
  if (request.action === "translateText") {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(request.targetLang)}&dt=t&q=${encodeURIComponent(request.text)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const translated = data[0].map((item) => item[0]).join("");
        sendResponse({ success: true, text: translated });
      })
      .catch((err) => sendResponse({ success: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }
});
