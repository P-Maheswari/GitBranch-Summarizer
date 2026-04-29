# 🌿 Branch Docs — GitHub AI Documenter

A Chrome Extension (Manifest V3) that auto-generates Markdown documentation for **every branch** of any GitHub repository using the **Groq API** (Llama 3 / Mixtral), then bundles everything into a ZIP you can download in one click.

---

## 📁 File Structure

```
github-branch-docs-extension/
├── manifest.json          ← MV3 manifest (permissions, hosts, scripts)
├── popup.html             ← Extension popup UI
├── popup.js               ← All popup logic (GitHub API + Groq + ZIP)
├── style.css              ← Popup styles (dark, JetBrains Mono + Syne)
├── options.html           ← Full settings page
├── options.js             ← Save/load settings from chrome.storage
├── options.css            ← Options page styles
├── background.js          ← MV3 service worker
├── content.js             ← Content script (detects repo from URL)
├── generate-icons.js      ← Helper to generate placeholder icons
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Installation

### Load Unpacked in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this folder (`github-branch-docs-extension/`)

### First Launch

On first install, the **Settings** page opens automatically. Enter:
- Your **Groq API Key** (get one free at [console.groq.com](https://console.groq.com))
- Optionally a **GitHub PAT** (raises rate limit from 60 to 5,000 req/hr)

---

## 🎯 How to Use

1. Navigate to any **GitHub repository** (e.g., `https://github.com/facebook/react`)
2. Click the **Branch Docs** extension icon
3. The popup detects the repo and shows the branch count
4. Enter your **Groq API Key** (if not already saved)
5. Choose a **model** (llama-3.1-8b-instant recommended)
6. Click **Start Documentation**
7. Watch the progress log as each branch is documented
8. A ZIP file downloads automatically when done

---

## 📄 ZIP Output Structure

```
owner_repo_branch-docs.zip
├── main/
│   └── branch-summary.md
├── develop/
│   └── branch-summary.md
├── feature/payments/
│   └── branch-summary.md
└── ...
```

Each `branch-summary.md` contains:
- Branch overview & likely purpose
- Key information table (SHA, author, date, message)
- Repository structure walkthrough
- Getting started guide (inferred from file tree)
- Things to know / gotchas
- Related branches speculation

---

## ⚙️ Rate Limiting

| Model | Free Tier RPM | Recommended Delay |
|-------|--------------|-------------------|
| llama-3.1-8b-instant | 30 RPM | 2000ms |
| llama-3.3-70b-versatile | 30 RPM | 2500ms |
| llama-4-scout-17b | 30 RPM | 2000ms |
| mixtral-8x7b-32768 | 30 RPM | 2500ms |

The default delay is **2500ms** between requests. Adjust in Settings → "Request Delay" if you hit `429` errors.

---

## 🔑 API Keys

| Key | Where to get | Used for |
|-----|-------------|---------|
| Groq API Key | [console.groq.com](https://console.groq.com) | AI doc generation (required) |
| GitHub PAT | GitHub → Settings → Developer Settings | Higher rate limits (optional) |

All keys are stored in `chrome.storage.local` — they never leave your browser except for direct calls to the respective APIs.

---

## 🛠️ Tech Stack

- **Manifest V3** Chrome Extension
- **Vanilla JS** (no build step required)
- **JSZip** (via CDN) for ZIP bundling
- **Groq API** with Llama 3 / Mixtral models
- **GitHub REST API v3** for branch + tree data
- **Syne + JetBrains Mono** fonts
