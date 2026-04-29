// background.js — Manifest V3 Service Worker
// Handles extension lifecycle and inter-script messaging.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    // Open options page on first install so user can set API keys
    chrome.runtime.openOptionsPage();
  }
});

// Forward messages between content scripts and popup if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_REPO_INFO") {
    // Content script can report repo info to background
    // so popup can retrieve it via storage
    if (message.payload) {
      chrome.storage.session.set({ currentRepo: message.payload });
    }
    sendResponse({ ok: true });
    return true;
  }
});
