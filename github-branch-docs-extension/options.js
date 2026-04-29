const KEYS = ["groqKey", "githubPat", "groqModel", "delayMs", "maxTokens", "includeTree", "skipMerged"];

const $ = id => document.getElementById(id);

async function load() {
  const data = await chrome.storage.local.get(KEYS);

  if (data.groqKey)    $("groqKey").value    = data.groqKey;
  if (data.githubPat)  $("githubPat").value  = data.githubPat;
  if (data.groqModel)  $("groqModel").value  = data.groqModel;
  if (data.delayMs)    $("delayMs").value    = data.delayMs;
  if (data.maxTokens)  $("maxTokens").value  = data.maxTokens;

  $("includeTree").checked = data.includeTree !== false; // default true
  $("skipMerged").checked  = !!data.skipMerged;
}

async function save() {
  await chrome.storage.local.set({
    groqKey:     $("groqKey").value.trim(),
    githubPat:   $("githubPat").value.trim(),
    groqModel:   $("groqModel").value,
    delayMs:     parseInt($("delayMs").value, 10) || 1400,
    maxTokens:   parseInt($("maxTokens").value, 10) || 1024,
    includeTree: $("includeTree").checked,
    skipMerged:  $("skipMerged").checked,
  });

  const msg = $("savedMsg");
  msg.textContent = "✓ Settings saved!";
  msg.classList.add("show");
  setTimeout(() => msg.classList.remove("show"), 2200);
}

async function clearAll() {
  if (!confirm("Clear all stored settings? This will remove your API keys.")) return;
  await chrome.storage.local.clear();
  KEYS.forEach(k => {
    const el = $(k);
    if (!el) return;
    if (el.type === "checkbox") el.checked = k === "includeTree";
    else el.value = "";
  });
  $("groqModel").value = "llama-3.1-8b-instant";
  $("delayMs").value   = "1400";
  $("maxTokens").value = "1024";

  const msg = $("savedMsg");
  msg.textContent = "Cleared.";
  msg.classList.add("show");
  setTimeout(() => msg.classList.remove("show"), 1800);
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  $("saveBtn").addEventListener("click", save);
  $("clearBtn").addEventListener("click", clearAll);
});
