# AURA System Architecture

AURA (Autonomous Universal Reasoning Assistant) is engineered as a unified, high-performance personal AI development engine built for local and cloud model execution on Mac.

```
                                      +---------------------------------------------+
                                      |                 USER / UI                   |
                                      |         React 19 + Vite + Tailwind          |
                                      +---------------------------------------------+
                                                             |
                                                     HTTP / SSE Stream
                                                             v
                                      +---------------------------------------------+
                                      |              AURA FAST SERVER               |
                                      |            Node.js / Express REST           |
                                      +---------------------------------------------+
                                                             |
                     +---------------------------------------+---------------------------------------+
                     |                                       |                                       |
                     v                                       v                                       v
      +-----------------------------+         +-----------------------------+         +-----------------------------+
      |      AURA ORCHESTRATOR      | <-----> |        TOOL REGISTRY        | <-----> |      PERSISTENT MEMORY      |
      |  Understand -> Plan ->      |         |  read/write/edit/search     |         |  User Preferences,          |
      |  Execute -> Observe ->      |         |  terminal/git/web/docs      |         |  Project Rules,             |
      |  Review -> Verify           |         |  Zod validation & safety    |         |  Decisions, Summaries       |
      +-----------------------------+         +-----------------------------+         +-----------------------------+
                     |                                       |                                       |
                     v                                       v                                       v
      +-----------------------------+         +-----------------------------+         +-----------------------------+
      |     AI PROVIDER ENGINE      |         |     PROJECT INDEXER & AST   |         |     LOCAL SQLITE DATABASE   |
      |  - Ollama (Local ₹0/month)  |         |  - Tree scanner             |         |  - node:sqlite sync DB      |
      |  - Google Gemini (Free Tier)|         |  - ripgrep / regex scanner  |         |  - Conversations & Messages |
      |  - OpenAI & Anthropic       |         |  - Symbol outline parser    |         |  - Tasks, Steps & Diffs     |
      |  - Offline Fallback Engine  |         |  - Framework detector       |         |  - Tool execution audits    |
      +-----------------------------+         +-----------------------------+         +-----------------------------+
```

---

## 1. Monorepo Package Structure

The repository is organized into cleanly separated packages:

- **`packages/shared`**: Common TypeScript interfaces, SSE event schemas, safety policies, diff engine, and UUID generators.
- **`packages/database`**: Direct SQLite interface using Node's native `node:sqlite`, repository layers for Settings, Conversations, Messages, Projects, Tasks, Steps, Memories, Diffs, and Tool Executions.
- **`packages/ai`**: Unified `AIProvider` interface supporting Ollama, Gemini, OpenAI, Claude, and built-in offline reasoning fallback.
- **`packages/project`**: Workspace scanner, framework and stack detector, ripgrep / fast regex searcher, and AST symbol extractor.
- **`packages/tools`**: Zod-validated tool registry containing file tools, controlled terminal execution, Git automation, memory operations, zero-cost web search, and document parsers.
- **`packages/memory`**: Persistent knowledge store with hybrid relevance scoring and rolling conversation summarization.
- **`packages/agent`**: Central autonomous reasoning orchestrator implementing the Understand -> Plan -> Execute -> Observe -> Reason -> Error Diagnosis & Fix -> Self-Review -> Final Response loop.
- **`apps/server`**: Express REST and Server-Sent Events (SSE) server.
- **`apps/web`**: React 19 single-page application with dark-first developer UI.

---

## 2. Orchestration Reasoning Loop

AURA operates on a deterministic finite state machine:

1. **Understand**: Parses user intent, active project metadata, and relevant persistent memories.
2. **Plan**: Decomposes complex coding tasks into sequential `TaskPlanStep` items.
3. **Execute**: Dispatches each step to the `ToolRegistry` with parameter validation and permission checks.
4. **Observe**: Captures stdout/stderr, file diffs, and tool output streams.
5. **Diagnose & Recover**: If a step or command fails (e.g. build failure, syntax error), captures the diagnostics, forms an automated remediation sub-step, and re-executes.
6. **Self-Review**: Verifies that modified files exist, diffs are clean, and automated tests pass before concluding.
7. **Stream Response**: Sends real-time SSE tokens, tool activity logs, diffs, and structured final summary to the frontend.
