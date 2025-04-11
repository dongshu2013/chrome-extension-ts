// Background service worker for Chrome Extension
// Minimal initialization for AI agent extension

// Log when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("AI Agent Extension Initialized");
});
