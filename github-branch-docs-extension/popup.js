/* ─── Constants ────────────────────────────────────────────────────────────── */
const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GITHUB_API  = "https://api.github.com";
const DELAY_MS    = 2500;   // ~43 RPM on free Groq tier (limit is 30 RPM for 70B)
const MAX_BRANCHES_PER_PAGE = 100;

/* ─── DOM refs ─────────────────────────────────────────────────────────────── */
const repoNameEl   = document.getElementById("repoName");
const repoSubEl    = document.getElementById("repoSub");
const branchBadge  = document.getElementById("branchBadge");
const branchCount  = document.getElementById("branchCount");
const groqKeyEl    = document.getElementById("groqKey");
const githubPatEl  = document.getElementById("githubPat");
const modelSelect  = document.getElementById("modelSelect");
const startBtn     = document.getElementById("startBtn");
const ctaText      = document.getElementById("ctaText");
const ctaIcon      = document.getElementById("ctaIcon");
const progressArea = document.getElementById("progressArea");
const progressLabel= document.getElementById("progressLabel");
const progressPct  = document.getElementById("progressPct");
const progressFill = document.getElementById("progressFill");
const progressLog  = document.getElementById("progressLog");
const errorBanner  = document.getElementById("errorBanner");
const errorText    = document.getElementById("errorText");
const optionsBtn   = document.getElementById("optionsBtn");

/* ─── State ────────────────────────────────────────────────────────────────── */
let repoOwner = null;
let repoRepo  = null;
let running   = false;

/* ─── Init ─────────────────────────────────────────────────────────────────── */
(async () => {
  await loadStoredKeys();
  await detectRepo();
  attachListeners();
})();

/* ─── Storage helpers ──────────────────────────────────────────────────────── */
async function loadStoredKeys() {
  const data = await chrome.storage.local.get(["groqKey", "githubPat", "groqModel"]);
  if (data.groqKey)   groqKeyEl.value   = data.groqKey;
  if (data.githubPat) githubPatEl.value = data.githubPat;
  if (data.groqModel) modelSelect.value = data.groqModel;
}

async function saveKeys() {
  await chrome.storage.local.set({
    groqKey:    groqKeyEl.value.trim(),
    githubPat:  githubPatEl.value.trim(),
    groqModel:  modelSelect.value,
  });
}

/* ─── Detect current GitHub repo ─────────────────────────────────────────── */
async function detectRepo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url   = tab?.url || "";
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/?#]+)/);
    if (match) {
      repoOwner = match[1];
      repoRepo  = match[2].replace(/\.git$/, "");
      repoNameEl.textContent = `${repoOwner} / ${repoRepo}`;
      repoSubEl.textContent  = "GitHub repository detected";
      await fetchBranchCount();
    } else {
      repoSubEl.textContent = "Open a GitHub repository tab first";
    }
  } catch (e) {
    repoSubEl.textContent = "Could not detect tab URL";
  }
  validateForm();
}

async function fetchBranchCount() {
  try {
    const headers = buildGitHubHeaders();
    const res  = await fetch(`${GITHUB_API}/repos/${repoOwner}/${repoRepo}/branches?per_page=1`, { headers });
    if (res.ok) {
      // Parse Link header to get total count if available
      const link = res.headers.get("Link") || "";
      const lastMatch = link.match(/page=(\d+)>; rel="last"/);
      if (lastMatch) {
        branchCount.textContent = lastMatch[1] + "+";
      } else {
        const branches = await res.json();
        branchCount.textContent = branches.length;
      }
      branchBadge.style.display = "block";
    }
  } catch {/* silent */}
}

/* ─── Listeners ────────────────────────────────────────────────────────────── */
function attachListeners() {
  groqKeyEl.addEventListener("input", () => { saveKeys(); validateForm(); });
  githubPatEl.addEventListener("input", saveKeys);
  modelSelect.addEventListener("change", saveKeys);
  startBtn.addEventListener("click", onStart);
  optionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

  // Eye toggles
  setupEyeToggle("toggleGroq", "groqKey", "eyeGroq");
  setupEyeToggle("togglePat",  "githubPat", "eyePat");
}

function setupEyeToggle(btnId, inputId, iconId) {
  document.getElementById(btnId).addEventListener("click", () => {
    const input = document.getElementById(inputId);
    const shown = input.type === "text";
    input.type  = shown ? "password" : "text";
    const icon  = document.getElementById(iconId);
    icon.innerHTML = shown
      ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`
      : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;
  });
}

function validateForm() {
  const hasKey  = groqKeyEl.value.trim().length > 10;
  const hasRepo = !!repoOwner && !!repoRepo;
  startBtn.disabled = !(hasKey && hasRepo) || running;
}

/* ─── Main process ─────────────────────────────────────────────────────────── */
async function onStart() {
  if (running) return;
  running = true;
  hideError();
  setRunningUI();

  try {
    await saveKeys();
    const groqKey  = groqKeyEl.value.trim();
    const githubPat = githubPatEl.value.trim();
    const model    = modelSelect.value;

    log("info", `Fetching branches for ${repoOwner}/${repoRepo}…`);
    const branches = await getAllBranches(githubPat);
    log("ok", `Found ${branches.length} branch(es)`);

    updateProgress(0, `Processing 0 / ${branches.length} branches`);
    branchCount.textContent = branches.length;
    branchBadge.style.display = "block";

    const zip = new JSZip();

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const pct = Math.round(((i) / branches.length) * 100);
      updateProgress(pct, `Generating docs: ${branch.name}`);
      log("info", `→ ${branch.name}`);

      try {
        const md = await generateMarkdown(branch, groqKey, model);
        zip.folder(branch.name).file("branch-summary.md", md);
        log("ok", `✓ ${branch.name}`);
      } catch (err) {
        log("err", `✗ ${branch.name}: ${err.message}`);
        // Write a placeholder so zip is still complete
        zip.folder(branch.name).file("branch-summary.md", `# ${branch.name}\n\n> Error generating docs: ${err.message}\n`);
      }

      // Rate-limit delay (skip after last branch)
      if (i < branches.length - 1) {
        await delay(DELAY_MS);
      }
    }

    updateProgress(95, "Bundling ZIP…");
    log("info", "Building ZIP archive…");

    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
    const url  = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${repoOwner}_${repoRepo}_branch-docs.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    updateProgress(100, "Done! ZIP downloaded.");
    log("ok", `✅ ZIP ready — ${branches.length} branch doc(s)`);
    setDoneUI(branches.length);

  } catch (err) {
    showError(err.message || String(err));
    setIdleUI();
  } finally {
    running = false;
    validateForm();
  }
}

/* ─── GitHub API ───────────────────────────────────────────────────────────── */
function buildGitHubHeaders() {
  const pat = githubPatEl.value.trim();
  const h   = { "Accept": "application/vnd.github+json" };
  if (pat) h["Authorization"] = `Bearer ${pat}`;
  return h;
}

async function getAllBranches(pat) {
  const headers = buildGitHubHeaders();
  let   page    = 1;
  const all     = [];

  while (true) {
    const res = await fetch(
      `${GITHUB_API}/repos/${repoOwner}/${repoRepo}/branches?per_page=${MAX_BRANCHES_PER_PAGE}&page=${page}`,
      { headers }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`GitHub API ${res.status}: ${body.message || res.statusText}`);
    }
    const data = await res.json();
    if (!data.length) break;
    all.push(...data);
    if (data.length < MAX_BRANCHES_PER_PAGE) break;
    page++;
  }
  return all;
}

async function getBranchDetails(branchName) {
  try {
    const headers = buildGitHubHeaders();
    const res = await fetch(
      `${GITHUB_API}/repos/${repoOwner}/${repoRepo}/branches/${encodeURIComponent(branchName)}`,
      { headers }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getRepoTree(sha) {
  try {
    const headers = buildGitHubHeaders();
    const res = await fetch(
      `${GITHUB_API}/repos/${repoOwner}/${repoRepo}/git/trees/${sha}?recursive=0`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.tree || []).slice(0, 40); // top 40 entries
  } catch { return []; }
}

/* ─── Groq AI ──────────────────────────────────────────────────────────────── */
async function generateMarkdown(branch, groqKey, model) {
  // Fetch detailed branch info
  const details = await getBranchDetails(branch.name);
  const sha     = details?.commit?.sha || branch.commit?.sha || "unknown";
  const author  = details?.commit?.commit?.author?.name || "unknown";
  const date    = details?.commit?.commit?.author?.date?.slice(0, 10) || "unknown";
  const message = details?.commit?.commit?.message?.split("\n")[0] || "";

  // Fetch tree for file/dir listing
  const tree  = await getRepoTree(sha);
  const files = tree.map(f => `${f.type === "tree" ? "📁" : "📄"} ${f.path}`).join("\n");

  const prompt = `You are a technical documentation expert. Generate a detailed, developer-friendly Markdown onboarding document for the following Git branch.

Repository: ${repoOwner}/${repoRepo}
Branch: ${branch.name}
Latest commit message: ${message}

Top-level files and directories:
${files || "(no tree data available)"}

Write a comprehensive Markdown file with these exact sections:

# Branch: \`${branch.name}\`

## 📋 Branch Overview
- One paragraph explaining the likely purpose/role of this branch based on its name, commit history, and file structure.
- Is it a feature, fix, release, hotfix, experiment, or main branch?

## 🔑 Key Information
| Field | Value |
|---|---|
| Branch Name | \`${branch.name}\` |
| Message | ${message || "—"} |

## 📁 Repository Structure
Describe the key directories and files listed above. Group them logically. Explain what each top-level folder likely contains.

## 🚀 Getting Started on This Branch
Provide step-by-step instructions a developer should follow when checking out this branch for the first time (clone, checkout, install dependencies, run dev server — infer the stack from the file tree).

## ⚠️ Things to Know
List 3-5 important caveats, gotchas, or things a new contributor should be aware of for this branch specifically.

## 🔗 Related Branches
Speculate on which branches this one likely merges into or from (e.g., main, develop, release).

Be concrete, actionable, and developer-focused. Use proper Markdown formatting throughout.`;
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (attempt < MAX_RETRIES){
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.4,
    }),
  });

  if (res.status === 429) {
      attempt++;
      const body = await res.json().catch(() => ({}));
      // Extract wait time from Groq's error message (e.g., "try again in 4.8s")
      const retryAfter = (parseFloat(body.error?.message?.match(/(\d+\.\d+)s/)?.[1]) || 5) * 1000;
      
      log("info", `Rate limited. Pausing for ${Math.ceil(retryAfter/1000)}s...`);
      await delay(retryAfter + 500); 
      continue; 
    }
    
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg  = body?.error?.message || res.statusText;
    throw new Error(`Groq ${res.status}: ${msg}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "_(no content returned)_";
}
throw new Error("Failed after multiple rate-limit retries.");
}
/* ─── UI helpers ───────────────────────────────────────────────────────────── */
function setRunningUI() {
  startBtn.classList.add("running");
  ctaText.textContent = "Processing…";
  ctaIcon.innerHTML   = `<circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32" style="animation:spin 1s linear infinite;transform-origin:center"><animate attributeName="stroke-dashoffset" values="32;0;32" dur="1.2s" repeatCount="indefinite"/></circle>`;
  progressArea.style.display = "flex";
  document.head.insertAdjacentHTML("beforeend", `<style>@keyframes spin{to{transform:rotate(360deg)}}</style>`);
}

function setDoneUI(count) {
  startBtn.classList.remove("running");
  startBtn.classList.add("done");
  ctaText.textContent = `✓ ${count} docs downloaded`;
  ctaIcon.innerHTML   = `<polyline points="20 6 9 17 4 12"/>`;
}

function setIdleUI() {
  startBtn.classList.remove("running", "done");
  ctaText.textContent = "Start Documentation";
  ctaIcon.innerHTML   = `<polygon points="5 3 19 12 5 21 5 3"/>`;
}

function updateProgress(pct, label) {
  progressFill.style.width  = pct + "%";
  progressPct.textContent   = pct + "%";
  progressLabel.textContent = label;
}

function log(type, message) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-dot"></span><span>${escHtml(message)}</span>`;
  progressLog.appendChild(entry);
  progressLog.scrollTop = progressLog.scrollHeight;
}

function showError(msg) {
  errorText.textContent    = msg;
  errorBanner.style.display = "flex";
}

function hideError() {
  errorBanner.style.display = "none";
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
