# AURA Troubleshooting Guide

---

## 1. Local AI / Ollama Issues

### "Ollama is not running or unreachable"
- **Cause**: Ollama service is not running on port `11434`.
- **Solution**:
  1. Open Terminal and run: `ollama serve` or launch the Ollama macOS app.
  2. Test in browser: `http://localhost:11434/api/tags`.
  3. In AURA Settings, click **Test Connection**.

### "Model not found"
- **Cause**: Requested model is not yet pulled locally.
- **Solution**:
  ```bash
  ollama pull qwen2.5-coder:latest
  ```

---

## 2. Port Conflicts

- **Server Port 3001 in use**: Change `PORT=3002` in `.env` and restart.
- **Vite Port 5173 in use**: Vite will automatically select next available port (`5174`).

---

## 3. SQLite Database Reset

To start fresh and reset all local conversations, projects, and task history:

```bash
rm -rf data/*.db*
npm run dev
```
The database schema will automatically re-initialize on boot.
