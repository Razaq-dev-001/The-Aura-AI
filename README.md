# AURA — Autonomous Universal Reasoning Assistant

> **A MINIMALIST, HIGH-PERFORMANCE PERSONAL AI CODING & REASONING ENGINE.**

AURA combines natural conversation, multi-step planning, codebase inspection, patch editing, sandboxed terminal execution, automated test recovery, zero-cost web research, and persistent memory into **ONE distraction-free, clean assistant**.

---

## Key Highlights

- ⚪ **Pure Black & White Minimalist UI**: Pure white background (`#ffffff`), crisp black font (`#000000`), zero color distractions, zero AI icons, spacious and clean layout.
- ⚡ **Free Unlimited AI (Out-of-the-Box)**: Immediate access to `free-gpt-4o`, `free-deepseek-r1`, `free-claude-3.5`, and `free-qwen-coder` with **zero API keys required**.
- 🌐 **OmniRoute / OpenRouter**: Native gateway supporting top free models (`deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-lite-preview-02-05:free`, `qwen/qwen-2.5-coder-32b-instruct:free`) + 300+ pro models.
- 🧠 **Autonomous Execution Loop**: Understand -> Plan -> Execute -> Observe -> Diagnose -> Self-Review.
- 🛠️ **Deep Codebase Inspection**: AST symbol parsing, project framework detector (React, Vite, Next.js, Express, Fastify, Rust, Go, Python), and `ripgrep` search.
- 📝 **Precise Visual Diffs**: Line-by-line patch editing with interactive Accept / Reject / Revert capabilities.
- 💻 **Controlled Terminal**: Sandboxed command execution with allowlists/denylists and secret redaction.
- 💾 **Cross-Session Memory**: Remembers your preferred coding stack, architectural rules, and project decisions.

---

## How to Run Step-by-Step

### Step 1: Clone & Install Dependencies

```bash
git clone <repo-url>
cd aura
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

### Step 3: Choose Your AI Option

AURA gives you 3 instant ways to run AI:

#### Option A: Free Unlimited AI (Zero Keys, 100% Instant)
1. Open [http://localhost:5173](http://localhost:5173).
2. Start chatting right away! Free Unlimited AI is active by default.
3. Select any model from the dropdown:
   - **Free GPT-4o**
   - **Free DeepSeek R1 (Reasoning)**
   - **Free Claude 3.5 Sonnet**
   - **Free Qwen 2.5 Coder**

#### Option B: OmniRoute / OpenRouter (Free DeepSeek R1 & Llama 3.3)
1. Click **"Model Gateway"** in the top bar.
2. Select the **OmniRoute** tab.
3. Paste your OpenRouter API key (`sk-or-v1-...`) from [openrouter.ai/keys](https://openrouter.ai/keys).
4. Click **Save & Connect**. You can now use top models including `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, and `google/gemini-2.0-flash-lite-preview-02-05:free`.

#### Option C: Official OpenAI / ChatGPT
1. Click **"Model Gateway"** in the top bar.
2. Select the **ChatGPT / OpenAI** tab.
3. Paste your OpenAI API key (`sk-...`) from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
4. Click **Save & Connect** to enable `gpt-4o`, `o3-mini`, or `o1`.

---

## Execution Modes

Toggle modes from the top bar or via keyboard shortcuts:

1. **`ASK`**: Conversational guidance and architectural explanation without touching workspace files.
2. **`ASSIST`** *(Default)*: Formulates step-by-step plans and creates diffs requiring user approval before applying.
3. **`AUTONOMOUS`**: Automatically performs multi-step tasks, edits code, runs builds/tests, and self-reviews until complete.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`⌘ + K` / `Ctrl + K`** | Open Command Palette |
| **`⌘ + Enter`** | Send message in chat |
| **`⌘ + B`** | Toggle Context Panel (Files, Diffs, Plans, Terminal, Memories) |
| **`/run <cmd>`** | Execute a terminal command |
| **`/project`** | Inspect active project architecture |
| **`/test`** | Run project test suite |
| **`/search <query>`** | Search codebase text using ripgrep |
| **`/research <query>`** | Perform live web research |

---

## Verification & Testing

Run the automated test suite across all packages:

```bash
npm test
```

To build all packages for production:

```bash
npm run build
```
