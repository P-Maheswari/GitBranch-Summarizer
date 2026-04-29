// content.js — runs on github.com/* pages
// Extracts owner/repo from the URL and sends it to background.

(function () {
  const match = location.pathname.match(/^\/([^/]+)\/([^/?#]+)/);
  if (!match) return;

  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, "");

  chrome.runtime.sendMessage({
    type: "GET_REPO_INFO",
    payload: { owner, repo: cleanRepo, url: location.href },
  });
})();
