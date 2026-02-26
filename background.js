chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id }, 
    files: ["fabric.min.js"]
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id }, 
    files: ["annotator.js"]
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Take the initial raw screenshot
  if (request.action === "takeScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ success: true, dataUrl: dataUrl });
    });
    return true; 
  }
  
  // 2. NEW: Receive the processed/cropped image and download it securely
  if (request.action === "downloadProcessedImage") {
    chrome.downloads.download({
      url: request.dataUrl,
      filename: "annotator-pro-screenshot.png",
      saveAs: true 
    });
    sendResponse({ success: true });
    return true;
  }
});