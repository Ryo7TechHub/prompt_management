chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ prompts: [] }, () => {
    console.log("初期プロンプトリストが設定されました。");
  });
});