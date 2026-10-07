# AURA Security & Safety

Security is built into every layer of AURA:

---

## 1. Command Safety Classification

Every terminal command is evaluated against strict security rules before execution:

- **`BLOCKED` (Strictly Forbidden)**:
  - Root directory deletions (`rm -rf /`, `rm -rf ~`)
  - Disk formatting and partition wipes (`mkfs`, `dd`, `fdisk`)
  - Privilege escalation (`sudo`, `su`, `doas`)
  - Forkbombs (`:(){ :|:& };:`)
  - System shutdown/reboots (`shutdown`, `reboot`, `init 0`)

- **`REQUIRES_CONFIRMATION`**:
  - File deletions (`rm`, `rmdir`, `unlink`)
  - Permission changes (`chmod`, `chown`)
  - Destructive Git operations (`git push`, `git reset --hard`)
  - Process termination (`kill`, `pkill`)

- **`SAFE` (Auto-approvable)**:
  - Read-only inspection (`ls`, `cat`, `pwd`, `git status`, `git diff`)
  - Build & test tools (`npm test`, `npm run build`, `pytest`, `cargo test`, `mvn test`)

---

## 2. Secret Redaction

AURA automatically scrubs sensitive API keys, tokens, and authorization headers from:
- Terminal output logs
- Database tool execution records
- Streamed responses
- Frontend settings payloads

Matches OpenAI, Gemini, GitHub tokens, Bearer headers, and common password formats.

---

## 3. Path Confinement

File operations are verified against the project root to prevent path traversal attacks (`../../`).
