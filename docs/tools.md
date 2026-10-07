# AURA Tool Registry & Capabilities

All tools in AURA are typed with [Zod](https://github.com/colinhacks/zod) schemas, audited in the SQLite `tool_executions` table, and governed by safety policies.

---

## 1. File Tools

- **`read_file`**: Reads project files with line numbering, slice ranges (`startLine`, `endLine`), size protection, and binary detection.
- **`edit_file`**: Applies precise search-and-replace patches, computes unified diffs, records before/after state in database, and supports instant rollback.
- **`write_file`**: Writes full file contents, creates parent directories if missing, and records diffs.
- **`create_file`**: Creates new files safely (fails if file already exists).
- **`delete_file`**: Deletes files with safety confirmation.
- **`list_directory`**: Lists folder contents with sizes and file types.
- **`search_files`**: Finds files matching glob patterns or filenames.
- **`search_content`**: Ultra-fast content searching using `ripgrep` with pure TypeScript line scanner fallback.

---

## 2. Terminal Tools

- **`run_command`**: Spawns controlled child processes inside project workspace with:
  - Configurable timeout (default 60s)
  - Real-time stdout/stderr streaming
  - Secret redaction
  - AbortSignal cancellation
  - Safety classification (Safe vs Confirm vs Blocked)

---

## 3. Git Integration

- **`git_status`**: Inspects modified, staged, and untracked files.
- **`git_diff`**: Shows uncommitted diffs.
- **`git_log`**: Displays recent commit history.
- **`git_commit`**: Stages modified files and creates commits with clear messages.

---

## 4. Web Research Tools

- **`web_search`**: Zero-cost DuckDuckGo / web scraper integration that extracts actual titles, destination URLs, excerpts, and sources without requiring paid API keys.
- **`fetch_web_page`**: Fetches URLs and converts HTML into clean readable markdown via Cheerio.

---

## 5. Document Understanding

- **`read_document`**: Parses text from PDF, CSV, JSON, Markdown, and TXT files with chunking and length limits.
