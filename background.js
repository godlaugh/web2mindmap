chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "generateMindmap",
    title: "🥬 生成当页思维导图",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "generateMindmap") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  }
});