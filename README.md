# 🚀 GitBranch Summarizer

**AI-powered repository intelligence at the speed of Groq.**

GitBranch Summarizer is a high-performance Chrome Extension that audits every branch in a GitHub repository and generates a structured documentation ZIP in seconds. Unlike "resident" AI agents that live in your IDE or CI/CD pipelines, this tool is designed for **On-Demand Intelligence**—perfect for technical leads, security auditors, and developers onboarding onto complex projects.

---

## 🧠 Why this exists
Standard AI tools like Claude or Copilot are excellent for active development, but they often require local cloning or high-friction setups. **GitBranch Summarizer** solves the "External Audit" problem:

* **Zero Cloning:** Analyze remote branches without wasting disk space.
* **Groq-Accelerated:** Leverages Llama 3.1 via Groq's LPU™ for near-instant inference.
* **Privacy-First (BYOK):** No middle-man servers. Your API keys travel directly from your browser to GitHub/Groq.
* **Cost Effective:** Optimized for the Groq Free Tier—no Anthropic or OpenAI paid subscriptions required.

## ✨ Key Features
* **Bulk Processing:** Sequential iteration through all repository branches.
* **Automated Documentation:** Generates `summary.md` for each branch covering architecture, key files, and purpose.
* **Rate-Limit Resilience:** Custom logic to handle `429` errors by parsing `retry-after` headers from Groq.
* **Client-Side Bundling:** Uses `JSZip` to package all summaries into a single archive entirely in the browser.

## 🛠️ Technical Stack
* **Inference:** [Groq Cloud](https://groq.com/) (Llama 3.1 70B/8B)
* **Archiving:** [JSZip](https://stuk.github.io/jszip/)
* **Platform:** Chrome Manifest V3 (Security-Hardened)
* **Language:** Vanilla JavaScript

## 🔑 Security & Key Management
This extension is built on a **Bring Your Own Key (BYOK)** model:
* **Storage:** Keys are stored in `chrome.storage.local`, a sandboxed database isolated to this extension.
* **Persistence:** Keys are never hardcoded and never included in Git commits.
* **Transmission:** Requests are sent only to `api.github.com` and `api.groq.com` via HTTPS.

## 🚀 Installation (Developer Mode)

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/gitbranch-summarizer.git](https://github.com/YOUR_USERNAME/gitbranch-summarizer.git)
    ```
2.  **Add Dependencies:**
    Download [jszip.min.js](https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js) and place it in the root folder (Required for Manifest V3 CSP compliance).
3.  **Load in Chrome:**
    * Navigate to `chrome://extensions/`.
    * Enable **Developer Mode**.
    * Click **Load Unpacked** and select this project folder.
4.  **Configure:**
    * Right-click the extension icon > **Options**.
    * Enter your **Groq API Key**.
    * (Optional) Enter a **GitHub PAT** to access private repositories.

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.
