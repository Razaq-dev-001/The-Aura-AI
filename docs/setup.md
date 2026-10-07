# AURA Local Setup Guide

AURA is optimized to run seamlessly on macOS (Apple Silicon / Intel) with zero paid subscriptions required.

---

## 1. Prerequisites

- **Node.js**: v20.0.0 or later (v22+ or v26 recommended)
- **Git**: installed (`git --version`)
- **Ollama** (Optional for ₹0/month local model execution): [https://ollama.com](https://ollama.com)

---

## 2. Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd aura
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment (Optional)**:
   A default `.env` file is generated automatically. To customize:
   ```bash
   cp .env.example .env
   ```

---

## 3. Starting Local Ollama (Recommended)

To run local open-source models completely offline and free:

1. Install Ollama from [ollama.com](https://ollama.com).
2. Pull your preferred coding model:
   ```bash
   ollama pull qwen2.5-coder:latest
   # or
   ollama pull llama3.2
   ```
3. Start the Ollama daemon (runs on `http://localhost:11434`).

---

## 4. Launching AURA

Start both the backend server and frontend web workspace concurrently:

```bash
npm run dev
```

- **Web Workspace**: `http://localhost:5173`
- **Backend API**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/health`

---

## 5. First Run & Configuration

When you first open `http://localhost:5173`:
1. The **Onboarding Wizard** will appear.
2. Select your AI provider (**Ollama**, **Google Gemini Free Tier**, or **Built-in Offline Engine**).
3. Click **Open Project Folder** in the sidebar to index any local project on your Mac.
