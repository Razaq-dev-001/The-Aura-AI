# AURA Agent & Orchestration Engine

AURA's central orchestrator coordinates multi-turn reasoning, tool execution, test verification, and automated error recovery.

---

## 1. Execution Modes

| Mode | Behavior | Permissions |
| :--- | :--- | :--- |
| **`ASK`** | Explanations, architectural advice, and code samples. | Read-only. File edits and commands are disabled. |
| **`ASSIST`** (Default) | Inspects files, generates sequential plans, creates visual diffs. | Requires explicit confirmation before applying diffs or running mutating commands. |
| **`AUTONOMOUS`** | Full end-to-end task execution. | Plans, edits files, executes builds & tests, diagnoses errors, and self-heals up to configured max iterations. |

---

## 2. Planning & Step Lifecycle

When a task begins:
1. `TaskPlanner` creates a structured `TaskPlan` with sequential steps.
2. Steps transition through states:
   - `PENDING` -> `RUNNING` -> `COMPLETED` or `FAILED`
3. If a tool fails (e.g. build failed, syntax error, module missing):
   - AURA enters the **Error Recovery Phase**.
   - Captures the error diagnostic.
   - Formulates a remediation sub-step (e.g. adding missing import or fixing arguments).
   - Retries until verified or iteration limit reached.

---

## 3. Self-Review & Verification

Before presenting completed results:
- **Files Check**: Ensures only necessary files were modified.
- **Diff Sanity**: Checks that modifications are valid and syntax-compliant.
- **Automated Tests**: Verifies that test suites (`npm test`, `pytest`, `cargo test`) exited with status code `0`.
- **Honesty Guarantee**: AURA will never report success if tests failed or files were not actually changed.
